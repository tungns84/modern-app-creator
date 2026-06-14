package com.acme.app.shared.scheduling;

import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduledTaskRegistrar {

    private final List<ScheduledTask> tasks;

    public ScheduledTaskRegistrar(List<ScheduledTask> tasks) {
        this.tasks = tasks;
    }

    @Scheduled(fixedDelayString = "${scheduling.task-executor.fixed-delay:PT1M}")
    public void executeTasks() {
        for (ScheduledTask task : tasks) {
            task.execute();
        }
    }
}
