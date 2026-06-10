# ScheduleIQ: Architecture & Interview Guide

This document is designed to be your ultimate study companion for technical interviews regarding the ScheduleIQ project. When an interviewer asks you to go deep into how you built this, use the concepts in this guide.

---

## 1. System Architecture (The "Blockwise" Explanation)

ScheduleIQ is a modern, microservice-inspired web application utilizing a polyglot tech stack to solve a computationally heavy problem (AI Scheduling) while maintaining a highly responsive UI.

### The Blocks
1. **Frontend (React + Vite + TailwindCSS)**
   - **Role:** The presentation layer. A Single Page Application (SPA) that provides distinct role-based views (Manager vs. Employee).
   - **Key Features:** Client-side routing, JWT-based state management, responsive mobile-first UI for employees, and high-density data visualization for managers.
2. **Backend API (Spring Boot / Java 21)**
   - **Role:** The core business logic and orchestration layer.
   - **Key Features:** Exposes secure REST APIs, handles Google OAuth2 authentication via Spring Security, issues JWT tokens, interacts with PostgreSQL, and orchestrates the complex AI scheduling algorithm.
3. **ML/AI Microservice (Python + Flask + Scikit-Learn)**
   - **Role:** A lightweight, specialized container dedicated to Machine Learning tasks.
   - **Key Features:** Exposes internal APIs to the Spring Boot backend to evaluate No-Show risks based on historical data. (Kept separate because Python is better suited for ML libraries than Java).
4. **Database (PostgreSQL)**
   - **Role:** Relational persistent storage.
   - **Key Features:** Stores complex relationships between Employees, Shifts, Swap Requests, and Alerts.

### Data Flow Example (Generating a Schedule)
1. **User Action:** Manager clicks "Generate AI Schedule" on the React frontend.
2. **API Call:** React sends a REST `POST` request to Spring Boot (`/api/schedule/generate`).
3. **Orchestration:** Spring Boot evaluates the constraints (budget, employee availability, rules).
4. **ML Inference:** Spring Boot makes a synchronous HTTP call to the Python ML Service to predict the "No-Show Risk" of the assigned shifts.
5. **Persistence:** Spring Boot saves the optimal shifts to PostgreSQL.
6. **Response:** Spring Boot returns success, and React triggers a UI update to render the new shifts.

---

## 2. Deep Dive: Key Algorithms & Logic

If asked to write code or explain the logic, you can point to these two core features.

### A. Constraint-Based Scheduling Engine
**Problem:** Assigning shifts to employees without exceeding a budget, respecting availability, and ensuring coverage.
**How you solved it (Mental Model for Whiteboard):**
- It's a variation of the *Knapsack Problem* or *Job Scheduling*.
- You fetch all employees and sort them by an "efficiency" score (e.g., lowest rate first, or highest reliability first).
- You iterate over the required shifts (demand).
- For each shift, you find the *first available employee* who:
  1. Is not already working that day.
  2. Will not exceed the total budget if assigned.
  3. Has the correct role (e.g., Cashier vs Support).
- You assign them, update the remaining budget, and move to the next shift.

### B. Shift Swap Marketplace & Fairness
**Problem:** Employees need to swap shifts, but managers need to ensure it doesn't hurt coverage.
**How you solved it:**
- A peer-to-peer request system. Employee A creates a `SwapRequest` pointing to Shift X and Employee B.
- The system evaluates the Swap. If Employee B has a higher "No-Show Risk" or pushes the budget into overtime, the system flags it with a `hasViolation = true`.
- Managers see the Swap Marketplace with AI-driven visual indicators (Red/Green banners). They can hit "Approve" (updating the shift owner in DB) or "Reject".

---

## 3. Common Interview Questions & Perfect Answers

**Q: Why did you choose Spring Boot for the backend and Python for the ML service instead of doing everything in one language?**
> **A:** "I wanted to use the right tool for the job. Spring Boot (Java) provides unmatched robustness, strong typing, and enterprise-grade security for the core transactional data and REST APIs. However, Python dominates the machine learning ecosystem. By decoupling the ML logic into a microservice, I was able to use Python's Scikit-learn easily without trying to force Java to do ML, while keeping the main backend incredibly fast and secure."

**Q: How did you handle State Management in React?**
> **A:** "Since the application heavily relies on API data, I kept state management localized to the top-level `App.jsx` component for authentication (`user` state), and used React's `useState` and `useEffect` within individual page components to fetch and hold their specific data. I used a custom `api.js` wrapper to intercept 401 Unauthorized errors globally and clear the JWT token, ensuring secure, centralized network handling."

**Q: Tell me about your Database Schema. How did you structure it?**
> **A:** "I used a normalized PostgreSQL schema. The core entities are `Employee` and `Shift`. A `Shift` has a Many-to-One relationship with an `Employee`. The tricky part was the `SwapRequest`. A SwapRequest needs references to the original shift, the requester (Employee), and the target (Employee). By setting up foreign keys for all these, I ensured data integrity so we never have a swap request for a shift that gets deleted."

**Q: What was the hardest bug you faced and how did you fix it?**
> **A:** "Managing the Docker Compose networking between the frontend, Spring Boot, and Python. Initially, the frontend was trying to call `localhost:8080` from inside the Docker container, which failed because `localhost` inside the frontend container isn't the backend container. I learned about Docker's internal DNS and realized the frontend (React) runs in the user's browser, so it *must* call `localhost`, while Spring Boot calls the ML service using the container name `http://ml-service:5000` internally."

---

## 4. Whiteboard Coding Challenge Prep
If asked to write the scheduling logic on a whiteboard, write something simple like this pseudo-code:

```java
public List<Shift> generateSchedule(List<Requirement> demands, List<Employee> staff, double budget) {
    List<Shift> finalSchedule = new ArrayList<>();
    
    for (Requirement req : demands) {
        Employee bestFit = findBestEmployee(staff, req, budget);
        if (bestFit != null) {
            finalSchedule.add(new Shift(bestFit, req.time));
            budget -= bestFit.getHourlyRate() * req.duration;
            bestFit.addHours(req.duration);
        }
    }
    return finalSchedule;
}
```
Explain that `findBestEmployee` filters out people on vacation, over 40 hours, or too expensive. This shows you understand algorithmic constraints!
