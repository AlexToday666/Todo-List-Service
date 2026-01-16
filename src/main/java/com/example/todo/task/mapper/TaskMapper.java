package com.example.todo.task.mapper;

import com.example.todo.task.dto.TaskRequestDto;
import com.example.todo.task.dto.TaskResponseDto;
import com.example.todo.task.model.Task;
import org.springframework.stereotype.Component;

@Component
public class TaskMapper {
    public TaskResponseDto toDto(Task task) {
        TaskResponseDto dto = new TaskResponseDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setCompleted(task.isComplete());
        dto.setCreatedAt(task.getCreatedAt());
        return dto;
    }
    
    public Task toEntity(TaskRequestDto dto) {
        Task task = new Task();
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setComplete(dto.isCompleted());
        return task;
    }
}
