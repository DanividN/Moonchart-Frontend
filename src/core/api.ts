// API Client to interact with FastAPI and Celery worker.
const BASE_URL = 'http://localhost:8000/api/v1';

export class APIClient {
  private static token: string | null = null;
  private static projectId: string | null = null;

  // 1. Authenticate or Register test user
  public static async authenticate(): Promise<string> {
    if (this.token) return this.token;

    const email = 'test_charter@antigravity.com';
    const password = 'Password123!';

    try {
      // Try logging in
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginRes = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        this.token = data.access_token;
        return this.token!;
      }

      // If login fails, register the user
      const registerRes = await fetch(`${BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: 'Mooncharts Charter' }),
      });

      if (registerRes.ok) {
        // Log in again
        const retryRes = await fetch(`${BASE_URL}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });
        const data = await retryRes.json();
        this.token = data.access_token;
        return this.token!;
      }

      throw new Error("Authentication failed");
    } catch (err) {
      console.warn("FastAPI offline or connection failed. Using high-fidelity local simulator.", err);
      throw err;
    }
  }

  // 2. Get or create active project
  public static async getOrCreateProject(token: string): Promise<string> {
    if (this.projectId) return this.projectId;

    const projectsRes = await fetch(`${BASE_URL}/projects/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (projectsRes.ok) {
      const projects = await projectsRes.json();
      if (projects.length > 0) {
        this.projectId = projects[0].id;
        return this.projectId!;
      }
    }

    // Create a new project if none exists
    const createRes = await fetch(`${BASE_URL}/projects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'My New Song Chart',
        description: 'Auto-analyzed Clone Hero Project'
      })
    });

    const project = await createRes.json();
    this.projectId = project.id;
    return this.projectId!;
  }

  // 3. Upload audio file
  public static async uploadAudio(projectId: string, file: File, token: string) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/audio/upload?project_id=${projectId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload audio asset");
    }
    return await res.json();
  }

  // 4. Trigger Celery processing pipeline
  public static async triggerAnalysis(projectId: string, instrument: string, token: string) {
    const res = await fetch(`${BASE_URL}/audio/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        project_id: projectId,
        job_type: `midi_generation:${instrument}` // Passes the target instrument to the backend pipeline
      })
    });

    if (!res.ok) {
      throw new Error("Failed to trigger audio processing");
    }
    return await res.json();
  }

  // 5. Poll job status until completed
  public static async pollJob(jobId: string, token: string): Promise<any> {
    const checkStatus = async (): Promise<any> => {
      const res = await fetch(`${BASE_URL}/audio/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error fetching job status");
      
      const job = await res.json();
      if (job.status === 'completed') {
        return job;
      }
      if (job.status === 'failed') {
        throw new Error(job.error_details || "Job execution failed");
      }

      // Wait 1.5 seconds and retry
      await new Promise(resolve => setTimeout(resolve, 1500));
      return checkStatus();
    };

    return checkStatus();
  }
}
