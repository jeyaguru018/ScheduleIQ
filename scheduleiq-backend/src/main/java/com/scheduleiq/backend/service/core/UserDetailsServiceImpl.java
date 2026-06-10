package com.scheduleiq.backend.service.core;

import com.scheduleiq.backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final EmployeeRepository employeeRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return employeeRepository.findByEmail(email)
                .map(employee -> new User(
                        employee.getEmail(),
                        employee.getPassword(),
                        List.of(new SimpleGrantedAuthority("ROLE_" + employee.getRole().name()))
                ))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
