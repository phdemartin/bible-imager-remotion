export type RenderStatus = 'rendering' | 'done' | 'error';

interface RenderJob {
    id: string;
    status: RenderStatus;
    progress: number;
    outputFile?: string;
    outputFilename?: string; // Custom filename for download
    error?: string;
    createdAt: number;
}

class RenderStore {
    private jobs: Map<string, RenderJob> = new Map();

    createJob(id: string, filename?: string) {
        this.jobs.set(id, {
            id,
            status: 'rendering',
            progress: 0,
            outputFilename: filename,
            createdAt: Date.now(),
        });
    }

    updateProgress(id: string, progress: number) {
        const job = this.jobs.get(id);
        if (job) {
            job.progress = progress;
        }
    }

    completeJob(id: string, outputFile: string) {
        const job = this.jobs.get(id);
        if (job) {
            job.status = 'done';
            job.progress = 1;
            job.outputFile = outputFile;
        }
    }

    failJob(id: string, error: string) {
        const job = this.jobs.get(id);
        if (job) {
            job.status = 'error';
            job.error = error;
        }
    }

    getJob(id: string) {
        return this.jobs.get(id);
    }
}

// Global instance to persist across API calls in dev (might be reset on hot reload, but good for now)
declare global {
    var _renderStore: RenderStore | undefined;
}

if (!global._renderStore) {
    global._renderStore = new RenderStore();
}

export const renderStore = global._renderStore;
