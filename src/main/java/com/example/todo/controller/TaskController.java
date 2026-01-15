package com.example.todo.controller;

import com.example.todo.dto.TaskRequestDto;
import com.example.todo.dto.TaskResponseDto;
import com.example.todo.mapper.TaskMapper;
import com.example.todo.model.Task;
import com.example.todo.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;
    private final TaskMapper mapper;

    public TaskController(TaskService service, TaskMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping
    public List<TaskResponseDto> getAllTasks() {
        return service.getAllTasks()
                .stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDto> getTask(@PathVariable Long id) {
        return service.getTaskById(id)
                .map(mapper::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public TaskResponseDto createTask(@RequestBody TaskRequestDto dto) {
        Task task = TaskMapper.toEntity(dto);
        Task savedTask = service.createTask(task);
        return mapper.toDto(savedTask);
    }

    @PutMapping("/{id}")
    public TaskResponseDto updateTask(@PathVariable Long id, @RequestBody TaskRequestDto dto) {
        Task task = TaskMapper.toEntity(dto);
        Task updatedTask = service.updateTask(id, task);
        return mapper.toDto(updatedTask);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        service.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
