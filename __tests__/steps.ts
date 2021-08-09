import { StepDefinitions } from "jest-cucumber";

import MicroJobScheduler, { Job } from "../src/index";

const successMock = jest.fn().mockImplementation(async (job: Job) => {
  expect(job.running).toBe(true);
  return "Success job";
});

const failureMock = jest.fn().mockImplementation(async (job: Job) => {
  expect(job.running).toBe(true);
  throw "Failed job";
});

const steps: StepDefinitions = ({ given, and, when, then }) => {
  let scheduler: MicroJobScheduler | null = null;
  let mockFns: Record<string, jest.Mock> = {};

  function expectJob(jobName: string) {
    const job = scheduler?.getJobs().find((j) => j.data.jobName === jobName);
    expect(job).toBeTruthy();
    return job!;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    scheduler = new MicroJobScheduler();
  });

  afterEach(() => {
    if (scheduler) scheduler.stop();
    scheduler = null;
    mockFns = {};
  });

  given(/(.*) is added with the following options:/, (jobName, options) => {
    options = JSON.parse(options);
    mockFns[jobName] = jest.fn().mockImplementation(successMock);
    scheduler?.addJob({ ...options, fn: mockFns[jobName] }, { jobName });
  });

  and("the scheduler is started", () => {
    scheduler?.start();
  });

  then(/(.*) should have run (\d+) times?/, (jobName, count) => {
    expect(mockFns[jobName]!.mock.calls.length).toEqual(Number(count));
  });

  when(/time is advanced by (\d+) seconds?/, (secs) => {
    jest.advanceTimersByTime(Number(secs) * 1000);
  });

  when(/time is advanced by (\d+) minutes?/, (mins) => {
    jest.advanceTimersByTime(Number(mins) * 60 * 1000);
  });

  and(/concurrency for (.*) is set to (\d+)/, (concurrencyKey, concurrency) => {
    scheduler?.setConcurrency(concurrencyKey, Number(concurrency));
  });

  and(/(.*) throws an error/, (jobName) => {
    mockFns[jobName]?.mockImplementation(failureMock);
  });

  and(/(.*) will not be marked errored/, (jobName) => {
    const job = expectJob(jobName);
    expect(job.errored).toBe(false);
  });

  and(/(.*) will be marked errored/, (jobName) => {
    const job = expectJob(jobName);
    expect(job.errored).toBe(true);
  });

  and(/(.*) will have the result "(.*)"/, (jobName, res) => {
    const job = expectJob(jobName);
    expect(job.lastResult).toEqual(res);
  });

  when(/(.*) is removed/, (jobName) => {
    const job = expectJob(jobName);
    scheduler?.removeJob(job.id);
  });

  when(/(.*) data is updated to:/, (jobName, data) => {
    data = JSON.parse(data);
    const job = expectJob(jobName);
    scheduler?.updateJobData(job.id, data);
  });

  then(/(.*) data will be:/, (jobName, data) => {
    data = JSON.parse(data);
    const job = expectJob(jobName);
    expect(job.data).toStrictEqual(data);
  });
};

export default steps;
