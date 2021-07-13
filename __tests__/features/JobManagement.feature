Feature: Job Management

    Scenario: Jobs can be removed
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
        When job1 is removed
        And time is advanced by 1 minute
        Then job1 should have run 1 times

    Scenario: Job data can be updated
        Given job1 is added with the following options:
        """
        {
            "durationBetweenRuns": "PT1M",
            "concurrencyKey": "testJob"
        }
        """
        When job1 data is updated to:
        """
        {
            "jobName": "job1",
            "some": "data"
        }
        """
        Then job1 data will be:
        """
        {
            "jobName": "job1",
            "some": "data"
        }
        """

