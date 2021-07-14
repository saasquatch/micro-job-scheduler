import createDebug from "debug";
import { v4 as uuid } from "uuid";
import { Duration, DateTime } from "luxon";
import { EventEmitter } from "events";

export interface Job<JobData = any> {
  id: string;
  concurrencyKey: string;
  durationBetweenRuns: string;
  data?: JobData;
  fn: (job: Job) => Promise<any>;
  running: boolean;
  errored: boolean;
  lastStarted?: DateTime;
  lastResult?: any;
}

type JobOptions = Pick<Job, "durationBetweenRuns" | "concurrencyKey" | "fn">;

const debug = createDebug("scheduler");

class MicroJobScheduler extends EventEmitter {
  private jobs: Job[] = [];
  private concurrency: Record<string, number> = {};
  private checkInterval: NodeJS.Timer | null = null;

  start() {
    if (this.checkInterval) {
      throw new Error("JobScheduler already running");
    }
    this.checkInterval = setInterval(this.schedule.bind(this), 1000);
    debug("Job scheduler started");
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      debug("Job scheduler stopped");
    }
  }

  getJobs() {
    return [...this.jobs];
  }

  setConcurrency(concurrencyKey: string, concurrency: number) {
    this.concurrency[concurrencyKey] = concurrency;
  }

  addJob(options: JobOptions, data?: any) {
    this.validateDuration(options.durationBetweenRuns);

    const job: Job = {
      id: uuid(),
      running: false,
      errored: false,
      data,
      ...options,
    };

    this.jobs.push(job);

    debug(
      "Added job [%s], concurrencyKey [%s], durationBetweenRuns [%s], data [%o]",
      job.id,
      job.concurrencyKey,
      job.durationBetweenRuns,
      job.data
    );

    return job.id;
  }

  removeJob(jobid: string) {
    const jobIndex = this.jobs.findIndex((j) => j.id === jobid);
    if (jobIndex > -1) {
      const job = this.jobs[jobIndex]!;
      this.jobs.splice(jobIndex, 1);
      debug(
        "Removed job [%s], concurrencyKey [%s], durationBetweenRuns [%s], data [%o]",
        job.id,
        job.concurrencyKey,
        job.durationBetweenRuns,
        job.data
      );
    }
  }

  updateJobData(jobid: string, data?: any) {
    const job = this.findJob(jobid);
    if (job) {
      job.data = data;
      debug(
        "Updated job data [%s], concurrencyKey [%s], durationBetweenRuns [%s], data [%o]",
        job.id,
        job.concurrencyKey,
        job.durationBetweenRuns,
        job.data
      );
    }
  }

  updateJobDurationBetweenRuns(jobid: string, duration: string) {
    const job = this.findJob(jobid);
    if (job) {
      this.validateDuration(duration);
      job.durationBetweenRuns = duration;
    }
  }

  private validateDuration(duration: string) {
    if (!Duration.fromISO(duration).isValid) {
      throw new Error(`"${duration}" is not a valid ISO duration`);
    }
  }

  private findJob(jobid: string) {
    const jobIndex = this.jobs.findIndex((j) => j.id === jobid);
    return jobIndex > -1 ? this.jobs[jobIndex]! : null;
  }

  private async schedule() {
    const jobsByConcurrencyKey = this.jobs.reduce((prev, job) => {
      if (!prev[job.concurrencyKey]) {
        prev[job.concurrencyKey] = {
          jobs: [],
          running: 0,
        };
      }

      prev[job.concurrencyKey]!.jobs.push(job);
      if (job.running) {
        prev[job.concurrencyKey]!.running++;
      }

      return prev;
    }, {} as Record<string, { jobs: Job[]; running: number }>);

    Object.keys(jobsByConcurrencyKey).forEach((concurrencyKey) => {
      const jobsThatHaveNotRun = jobsByConcurrencyKey[
        concurrencyKey
      ]!.jobs.filter((j) => !j.lastStarted);

      // Sort the jobs that have run by last started
      const jobsThatHaveRun = jobsByConcurrencyKey[concurrencyKey]!.jobs.filter(
        (j) => !!j.lastStarted
      ).sort((a, b) => {
        return a.lastStarted! < b.lastStarted!
          ? -1
          : a.lastStarted! > b.lastStarted!
          ? 1
          : 0;
      });

      const jobs = [...jobsThatHaveNotRun, ...jobsThatHaveRun];

      const concurrency = this.concurrency[concurrencyKey] || 1;
      let running = jobsByConcurrencyKey[concurrencyKey]!.running;
      while (running < concurrency) {
        const jobToRun = jobs.find(
          (j) =>
            !j.running &&
            (!j.lastStarted ||
              j.lastStarted
                .plus(Duration.fromISO(j.durationBetweenRuns))
                .diffNow().milliseconds <= 0)
        );
        if (!jobToRun) break;
        running++;
        this.runJob(jobToRun);
      }
    });
  }

  private async runJob(job: Job) {
    job.running = true;
    job.lastStarted = DateTime.now();
    debug(
      "Running job [%s], concurrencyKey [%s], data [%o]",
      job.id,
      job.concurrencyKey,
      job.data
    );
    this.emit("jobStarted", { ...job });
    try {
      job.lastResult = await job.fn({ ...job });
      job.errored = false;
      debug(
        "Job [%s] completed, concurrencyKey [%s], lastResult: [%o]",
        job.id,
        job.concurrencyKey,
        job.lastResult
      );
      this.emit("jobCompleted", { ...job });
    } catch (e) {
      job.lastResult = e;
      job.errored = true;
      debug(
        "Job [%s] errored, concurrencyKey [%s], lastResult: [%o]",
        job.id,
        job.concurrencyKey,
        job.lastResult instanceof Error
          ? job.lastResult.message
          : job.lastResult
      );
      this.emit("jobFailed", { ...job });
    } finally {
      job.running = false;
    }
  }
}

export default MicroJobScheduler;
