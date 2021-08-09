Feature: Job Scheduling

    Scenario: Single job runs
        Given job1 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        And the scheduler is started
        When time is advanced by 1 second
        Then job1 should have run 1 time
        When time is advanced by 1 minute
        Then job1 should have run 2 times

    Scenario: Jobs with different concurrency keys run simultaneously
        Given job1 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        Given job2 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob2"
        }
        """
        And the scheduler is started
        When time is advanced by 1 second
        Then job1 should have run 1 time
        And job2 should have run 1 time
        When time is advanced by 1 minute
        Then job1 should have run 2 times
        And job2 should have run 2 times

    Scenario: Jobs with the same concurrency key run up to the limit of concurrency
        Given job1 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        Given job2 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        Given job3 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        And concurrency for testJob is set to 2
        And the scheduler is started
        When time is advanced by 1 second
        Then job1 should have run 1 time
        And job2 should have run 1 time
        And job3 should have run 0 times
        When time is advanced by 1 minute
        Then job3 should have run 1 times
        And job1 should have run 2 times
        And job2 should have run 1 times
        When time is advanced by 1 minutes
        Then job2 should have run 2 times
        And job3 should have run 2 times
        And job1 should have run 2 times

    Scenario: Jobs that succeed should not be in an error state
        Given job1 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        And the scheduler is started
        When time is advanced by 1 second
        Then job1 should have run 1 time
        And job1 will not be marked errored
        And job1 will have the result "Success job"

    Scenario: Jobs that fail should be in an error state
        Given job1 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        And job1 throws an error
        And the scheduler is started
        When time is advanced by 1 second
        Then job1 should have run 1 time
        And job1 will be marked errored
        And job1 will have the result "Failed job"

