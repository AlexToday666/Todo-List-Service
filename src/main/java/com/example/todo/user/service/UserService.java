package com.example.todo.user.service;

import com.example.todo.user.model.User;
import  com.example.todo.user.repository.UserRepository;
import org.springframework.security.crypto.password;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder){
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User createUser(String username, String email, String password){
        if (userRepository.existsByUsername(username)){
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(email)){
            throw new RuntimeException("Email already exists")
        }
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(password);
        return userRepository.save(user);
    }

    public Optional<User> findByUsername(String username){
        return userRepository.findByUsername(username);
    }
}
