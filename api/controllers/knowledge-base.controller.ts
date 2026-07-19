import { Response } from "express";
import { Database } from "../../core/services/database";
import { AuthenticatedRequest } from "../middlewares/auth";
import { answerKnowledgeBaseQuestion, getEmbedding, runKnowledgeBaseEngine } from "../../agents/ai-dispatcher";
import { StorageService } from "../../core/services/storage.service";
import { logger } from "../../core/utils/logger";

interface IndexableDoc {
  id: string;
  category: string;
  title: string;
  content: string;
}

export class KnowledgeBaseController {
  /**
   * Fetch the persistent knowledge base for a repository
   */
  static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const repo = Database.getRepository(id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      const kb = Database.getKnowledgeBase(id);
      if (!kb) {
        res.json({ exists: false });
        return;
      }

      res.json({ exists: true, knowledgeBase: kb });
    } catch (error: any) {
      logger.error("Failed to retrieve knowledge base", error);
      res.status(500).json({ error: error.message || "Failed to retrieve knowledge base." });
    }
  }

  /**
   * Triggers background analysis to generate and save the persistent Knowledge Base
   */
  static async generate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const repo = Database.getRepository(id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      repo.files = await StorageService.getFiles(repo.id, repo.files);

      logger.info(`Starting Knowledge Base Generation Engine for repository: ${repo.name}`);
      
      // Run the full AI code understanding and schema parser
      const generatedData = await runKnowledgeBaseEngine(repo.files);

      // Save into persistent JSON db
      const savedKb = Database.saveKnowledgeBase(id, generatedData);

      Database.createNotification(
        req.user.id,
        `Project Knowledge Base successfully compiled for repository "${repo.name}"`,
        "success",
        `/repository/${id}?tab=knowledge_base`
      );

      res.status(201).json({ success: true, knowledgeBase: savedKb });
    } catch (error: any) {
      logger.error("Failed to generate knowledge base", error);
      res.status(500).json({ error: error.message || "Failed to execute Knowledge Base generation." });
    }
  }

  /**
   * Add a project note / reminder
   */
  static async addNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content, author = "user" } = req.body;
      
      const repo = Database.getRepository(id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ error: "Note content cannot be empty." });
        return;
      }

      const note = Database.addKnowledgeBaseNote(id, author, content);
      if (!note) {
        res.status(400).json({ error: "Please generate the knowledge base first before adding notes." });
        return;
      }

      res.status(210).json({ success: true, note });
    } catch (error: any) {
      logger.error("Failed to add project note", error);
      res.status(500).json({ error: error.message || "Failed to add project note." });
    }
  }

  /**
   * Update an existing project note
   */
  static async updateNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, noteId } = req.params;
      const { content } = req.body;

      const repo = Database.getRepository(id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ error: "Note content cannot be empty." });
        return;
      }

      const note = Database.updateKnowledgeBaseNote(id, noteId, content);
      if (!note) {
        res.status(404).json({ error: "Note or Knowledge Base not found." });
        return;
      }

      res.json({ success: true, note });
    } catch (error: any) {
      logger.error("Failed to update project note", error);
      res.status(500).json({ error: error.message || "Failed to update note." });
    }
  }

  /**
   * Delete an existing project note
   */
  static async deleteNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, noteId } = req.params;

      const repo = Database.getRepository(id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      const success = Database.deleteKnowledgeBaseNote(id, noteId);
      if (!success) {
        res.status(404).json({ error: "Note or Knowledge Base not found." });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Failed to delete project note", error);
      res.status(500).json({ error: error.message || "Failed to delete note." });
    }
  }

  /**
   * Perform a robust RAG-based Semantic Search over the Knowledge Base
   */
  static async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { query } = req.body;

      const repo = Database.getRepository(id);
      if (!repo || repo.userId !== req.user.id) {
        res.status(404).json({ error: "Repository not found." });
        return;
      }

      if (!query || !query.trim()) {
        res.status(400).json({ error: "Search query is required." });
        return;
      }

      const kb = Database.getKnowledgeBase(id);
      if (!kb) {
        res.status(400).json({ error: "Please generate the knowledge base first to perform semantic search." });
        return;
      }

      // Step 1: Accumulate all text snippets from the database
      const docs: IndexableDoc[] = [
        { id: "project_summary", category: "Project Summary", title: "High-Level Project Overview", content: kb.projectSummary },
        { id: "tech_stack", category: "Technology Stack", title: "Technology and Environment Details", content: kb.technologyStackSummary },
        { id: "architecture", category: "Architecture", title: "Architecture and Structural Patterns", content: kb.architectureSummary },
        { id: "folder_tree", category: "Folder Directory Structure", title: "File System Layout Tree", content: kb.folderTree },
        { 
          id: "database_detect", 
          category: "Database Configuration", 
          title: `Database System (${kb.databaseDetection.dbType})`, 
          content: `Detected Database: ${kb.databaseDetection.dbType}. ORM/Driver: ${kb.databaseDetection.orm || "None detected"}. Files related: ${kb.databaseDetection.detectedFiles.join(", ")}` 
        }
      ];

      // Add individual notes
      kb.notes.forEach((n) => {
        docs.push({
          id: `note_${n.id}`,
          category: "Project Note",
          title: `Note created by ${n.author}`,
          content: n.content
        });
      });

      // Add API endpoints
      kb.apiDetection.forEach((api, idx) => {
        docs.push({
          id: `api_${idx}`,
          category: "API Endpoint",
          title: `${api.method} ${api.path}`,
          content: `${api.description} (Handler file: ${api.handlerFile})`
        });
      });

      // Add configuration files
      kb.configurationDetection.forEach((cfg, idx) => {
        docs.push({
          id: `config_${idx}`,
          category: "Configuration File",
          title: cfg.file,
          content: `Type: ${cfg.type}. Configuration purpose: ${cfg.purpose}`
        });
      });

      // Step 2: First-stage keyword-based matching for efficiency and backoff
      const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);
      const scoredDocs = docs.map((doc) => {
        const titleWords = doc.title.toLowerCase();
        const contentWords = doc.content.toLowerCase();
        let keywordScore = 0;
        
        queryTerms.forEach((term) => {
          if (titleWords.includes(term)) keywordScore += 3; // weight title matches higher
          if (contentWords.includes(term)) keywordScore += 1;
        });

        return { doc, keywordScore };
      });

      // Sort by keyword score and take the top 8 candidates to avoid exploding embedding quota limit
      const candidates = scoredDocs
        .filter((item) => item.keywordScore > 0 || queryTerms.length === 0)
        .sort((a, b) => b.keywordScore - a.keywordScore)
        .slice(0, 8)
        .map((item) => item.doc);

      // If we got no keyword matches, just take the core summaries as candidates
      if (candidates.length === 0) {
        candidates.push(docs[0], docs[1], docs[2]);
      }

      // Step 3: Second-stage cosine similarity search using local deterministic embeddings.
      let matches: Array<{ doc: IndexableDoc; similarity: number }> = [];

      try {
        const queryEmbedding = await getEmbedding(query);
        
        matches = [];
        for (const doc of candidates) {
          try {
            const docText = `Category: ${doc.category}\nTitle: ${doc.title}\nContent: ${doc.content}`;
            const docEmbedding = getEmbedding(docText);
            
            // Calculate cosine similarity
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < queryEmbedding.length; i++) {
              dotProduct += queryEmbedding[i] * docEmbedding[i];
              normA += queryEmbedding[i] * queryEmbedding[i];
              normB += docEmbedding[i] * docEmbedding[i];
            }
            const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
            matches.push({ doc, similarity });
          } catch (e) {
            // Fallback score if embedding individual document fails
            matches.push({ doc, similarity: 0.5 });
          }
        }

        matches.sort((a, b) => b.similarity - a.similarity);
      } catch (embErr) {
        logger.warn("Using keyword search fallback as embedding server is unavailable", embErr);
        // Fallback to normalized keyword similarity
        matches = scoredDocs
          .sort((a, b) => b.keywordScore - a.keywordScore)
          .slice(0, 5)
          .map((item) => ({
            doc: item.doc,
            similarity: Math.min(0.9, 0.4 + (item.keywordScore / 15))
          }));
      }

      // Step 4: Retrieval-Augmented Generation (RAG) using Groq to draft a precise answer
      const topContextText = matches
        .slice(0, 4)
        .map((m) => `[Source: ${m.doc.category} - ${m.doc.title}]\n${m.doc.content}`)
        .join("\n\n");

      const answer = await answerKnowledgeBaseQuestion(query, topContextText);

      res.json({
        success: true,
        query,
        answer,
        matches: matches.slice(0, 5).map((m) => ({
          id: m.doc.id,
          category: m.doc.category,
          title: m.doc.title,
          snippet: m.doc.content.length > 180 ? m.doc.content.substring(0, 180) + "..." : m.doc.content,
          score: Math.round(m.similarity * 100)
        }))
      });
    } catch (error: any) {
      logger.error("Failed to perform semantic search over knowledge base", error);
      res.status(500).json({ error: error.message || "Failed to search knowledge base." });
    }
  }
}
