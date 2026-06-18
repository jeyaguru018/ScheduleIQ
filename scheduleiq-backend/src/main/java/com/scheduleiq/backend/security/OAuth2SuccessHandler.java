package com.scheduleiq.backend.security;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.repository.EmployeeRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final EmployeeRepository employeeRepository;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        
        Optional<Employee> employeeOpt = employeeRepository.findByEmail(email);
        
        if (employeeOpt.isPresent()) {
            Employee employee = employeeOpt.get();
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            
            String token = jwtService.generateToken(
                    Map.of(
                            "role", employee.getRole().name(),
                            "name", employee.getName(),
                            "employeeId", employee.getId()
                    ),
                    userDetails
            );
            
            String redirectUrl = "http://localhost:5173/oauth2/callback?token=" + token 
                    + "&role=" + employee.getRole().name()
                    + "&name=" + URLEncoder.encode(employee.getName(), StandardCharsets.UTF_8)
                    + "&employeeId=" + employee.getId();
            
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        } else if (employeeRepository.count() == 0) {
            Employee manager = Employee.builder()
                    .name(oAuth2User.getAttribute("name") != null ? oAuth2User.getAttribute("name") : "Manager")
                    .email(email)
                    .password("") // Managed by Google
                    .role(com.scheduleiq.backend.model.Role.MANAGER)
                    .baseHourlyRate(250.0)
                    .maxHoursPerWeek(48)
                    .reliabilityScore(1.0)
                    .fairnessScore(100)
                    .build();
            employeeRepository.save(manager);
            
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            String token = jwtService.generateToken(
                    Map.of(
                            "role", manager.getRole().name(),
                            "name", manager.getName(),
                            "employeeId", manager.getId()
                    ),
                    userDetails
            );
            
            String redirectUrl = "http://localhost:5173/oauth2/callback?token=" + token 
                    + "&role=" + manager.getRole().name()
                    + "&name=" + URLEncoder.encode(manager.getName(), StandardCharsets.UTF_8)
                    + "&employeeId=" + manager.getId();
            
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        } else {
            String redirectUrl = "http://localhost:5173/login?error=email_not_approved&email=" 
                    + URLEncoder.encode(email != null ? email : "", StandardCharsets.UTF_8);
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        }
    }
}
