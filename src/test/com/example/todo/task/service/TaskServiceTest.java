package com.example.todo.task.service;

import com.example.todo.task.model.Task;
import com.example.todo.task.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.times;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class TaskServiceTest {
    private TaskRepository repository;
    private TaskService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(TaskRepository.class);
        service = new TaskService(repository);
    }

    @Test
    void testGetAllTasks() {
        Task t1 = new Task();
        t1.setId(1L);
        t1.setTitle("Test 1");

        Task t2 = new Task();
        t2.setId(2L);
        t2.setTitle("Test 2");

        when(repository.findAll()).thenReturn(List.of(t1, t2));

        List<Task> tasks = service.getAllTasks();
        assertEquals(2, tasks.size());
        verify(repository, times(1)).findAll();
    }

    @Test
    void testGetTaskbyIdNotFound() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        Optional<Task> result = service.getTaskById(1L);
        assertTrue(result.isEmpty());
    }

    @Test
    void testCreateTask() {
        Task task = new Task();
        task.setTitle("New Task");
        when(repository.save(task)).thenReturn(task);
        Task saved = service.createTask(task);
        assertEquals("New Task", saved.getTitle());
        verify(repository, times(1)).save(task);
    }

    @Test
    void testDeleteTask() {
        doNothing().when(repository).deleteById(1L);
        service.deleteTask(1L);
        verify(repository, times(1)).deleteById(1L);
    }
}
