<h1 align="center">micro-job-scheduler</h1>

<p align="center">Promise-based in-memory micro job scheduler.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/micro-job-scheduler"><img src="https://img.shields.io/npm/v/micro-job-scheduler/latest.svg?style=flat-square" alt="NPM version" /> </a>
  <a href="https://www.npmjs.com/package/micro-job-scheduler"><img src="https://img.shields.io/npm/dm/micro-job-scheduler.svg?style=flat-square" alt="NPM downloads"/> </a>
</p>

Sometimes you just want to run tasks at a regular interval, with some concurrency, and the overhead of job scheduling
systems like [agenda](https://github.com/agenda/agenda) are just too much.

This package implements a very simple job scheduler that allows you to run jobs on a schedule (defined by an ISO 8601
duration), with support for running jobs of a particular type with a level of concurrency.

It is implemented with a basic `setInterval` that runs once a second and looks for jobs to schedule.

## Getting Started

```ts
import MicroJobScheduler from "micro-job-scheduler";

const scheduler = new MicroJobScheduler();

for (let i = 0; i < 10; i++) {
  scheduler.addJob(
    {
      concurrencyKey: "aJob",
      durationBetweenRuns: "PT1M",
      fn: aJob,
    },
    {
      i,
    }
  );
}

scheduler.setConcurrency("aJob", 2);

async function aJob(jobId: string, data: any) {
  return new Promise((resolve) => {
    console.log("A JOB IS RUNNING", jobId, data);
    setTimeout(() => {
      console.log("A JOB IS COMPLETED", jobId, data);
      resolve();
    }, 10000);
  });
}

scheduler.start();
```

## API

### `start()`

Starts the job scheduler.

### `stop()`

Stop the job scheduler.

### `addJob(jobOptions, jobData)`

Add a job with the given options, and the given data. Options you can pass are:

- `durationBetweenRuns`: An ISO8601 duration string, like `PT5M` to indicate 5 minutes
- `concurrencyKey`: A string which groups jobs together for the purpose of concurrency
- `fn`: The function to run your job, with the signature `fn(jobid: string, data: any): Promise<any>`

### `setConcurrency(concurrencyKey, concurrency)`

Sets how many jobs with a particular `concurrencyKey` can run simultaneously.

### `getJobs()`

Returns a copy of the internal scheduler state.

## Supporters

This package is supported by [SaaSquatch](https://saasquatch.com).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
