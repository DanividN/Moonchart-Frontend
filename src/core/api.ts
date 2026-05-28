// API Client to interact with FastAPI and Celery worker.
const BASE_URL = 'http://localhost:8000/api/v1';

export class APIClient {

  // 3. Upload audio file
  public static async uploadAudio(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/audio/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload audio asset");
    }
    return await res.json();
  }

  // 3.5. Upload isolated stem file
  public static async uploadStem(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/audio/upload-stem`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      throw new Error("Failed to upload stem file");
    }

    return await res.json();
  }

  // 4. Trigger Celery processing pipeline
  public static async triggerAnalysis(instrument: string, sensitivity: number = 50.0, complexity: number = 50.0, bpm: number = 120.0, isIsolatedStem: boolean = false) {
    const res = await fetch(`${BASE_URL}/audio/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        job_type: `midi_generation:${instrument}`, // Passes the target instrument to the backend pipeline
        options: {
          sensitivity,
          complexity,
          bpm,
          is_isolated_stem: isIsolatedStem
        }
      })
    });

    if (!res.ok) {
      throw new Error("Failed to trigger audio processing");
    }
    return await res.json();
  }

  // 5. Poll job status until completed
  public static async pollJob(jobId: string): Promise<any> {
    const checkStatus = async (): Promise<any> => {
      const res = await fetch(`${BASE_URL}/audio/jobs/${jobId}`);

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
