import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RepositoryDetail from './RepositoryDetail';
import { useAppStore } from '../store/useAppStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

describe('RepositoryDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      authToken: 'token',
      repositories: [
        { 
          id: '1', 
          name: 'Test Repo 1', 
          language: 'TypeScript', 
          framework: 'React', 
          status: 'ready', 
          sourceType: 'zip', 
          userId: '1', 
          localPath: '/test', 
          branch: 'main', 
          connectedAt: '2026-07-18T00:00:00Z', 
          files: [
            { path: 'src/index.ts', content: 'console.log("hello");', size: 21 }
          ]
        },
      ],
      activeAnalyses: [],
      handleTriggerAnalysis: vi.fn(),
      handleSaveFile: vi.fn(),
      handleDeleteFile: vi.fn(),
    });
  });

  const renderRepositoryDetail = (initialRoute = '/repo/1') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/repo/:id/*" element={<RepositoryDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state when repository is not found', () => {
    renderRepositoryDetail('/repo/999');
    expect(screen.getByText('Loading repository...')).toBeInTheDocument();
  });

  it('renders repository name and navigation tabs', () => {
    renderRepositoryDetail('/repo/1');
    expect(screen.getByText('Test Repo 1')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
  });

  it('navigates back to dashboard when back button is clicked', () => {
    const { container } = renderRepositoryDetail('/repo/1');
    const backBtn = container.querySelector('button'); // First button is back
    fireEvent.click(backBtn!);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('switches tabs correctly', () => {
    renderRepositoryDetail('/repo/1');
    const overviewTab = screen.getByText('Architecture');
    fireEvent.click(overviewTab);
    expect(mockNavigate).toHaveBeenCalledWith('/repo/1/overview');
  });

  it('displays active analysis state', () => {
    useAppStore.setState({
      activeAnalyses: [
        {
          id: 'a1',
          repositoryId: '1',
          analysisType: 'code_review',
          status: 'running',
          createdAt: '2026-07-18T00:00:00Z'
        }
      ]
    });
    renderRepositoryDetail('/repo/1/code_review');
    
    // Check if loading state or running state is present
    expect(screen.getByText(/Auditing code and secrets/i)).toBeInTheDocument();
  });
});
