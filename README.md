<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/Version-1.0.0-orange" alt="Version" />

  <h1>🗓️ ScheduleIQ</h1>
  <p><strong>Next-Generation AI-Powered Workforce Scheduling & Management Platform</strong></p>
</div>

<br />

## 📖 Overview

**ScheduleIQ** is an enterprise-grade, AI-driven workforce management system designed to solve the complex constraints of shift scheduling. Leveraging advanced Constraint Programming (Google OR-Tools) and intelligent caching, it transforms hours of manual, error-prone roster planning into an automated, highly optimized process that ensures labor compliance, maximizes coverage, and prioritizes employee fairness.

Traditional scheduling tools are either too rigid or rely on simple rule-based algorithms. ScheduleIQ introduces a true mathematical optimization engine that balances budget constraints, employee availability, overlapping shift rules, and labor laws in real-time.

---

## ✨ Key Features

- 🧠 **AI-Powered Auto-Scheduler**: Utilizes Google OR-Tools (CP-SAT) to generate mathematically optimal schedules while respecting strict labor compliance laws (e.g., maximum 40-hour work weeks) and required rest periods (8+ hours between shifts).
- ⚡ **High-Performance Redis Caching**: Asynchronous scheduling jobs and real-time dashboard data are accelerated using Redis, drastically reducing database load and response times.
- 🔄 **Intelligent Fallback Mechanism**: Built-in greedy fallback algorithms ensure that if the mathematical constraint solver hits an infeasible state or Redis goes offline, a highly optimal schedule is still generated via Java-based heuristics.
- 📊 **Manager Command Center**: A comprehensive analytics dashboard providing real-time insights into labor costs, shift coverage, overtime compliance alerts, and fairness distribution.
- 🤝 **Employee Swap Marketplace**: A decentralized, self-serve marketplace allowing employees to negotiate and swap shifts, dynamically updating the roster upon manager approval.
- 🌗 **Premium UI/UX**: A highly polished, responsive interface built with Tailwind CSS, featuring seamless Light/Dark mode toggling and a modern, accessible design system.

---

## 🛠️ Tech Stack

**Backend**
- **Java 21 & Spring Boot 3**: Robust, scalable enterprise architecture.
- **Google OR-Tools**: Constraint programming solver for complex combinatorial optimization.
- **PostgreSQL**: Relational database for persistent transactional data.
- **Redis**: Distributed in-memory caching and message brokering.

**Frontend**
- **React.js & Vite**: Lightning-fast, modern frontend framework.
- **Tailwind CSS**: Utility-first styling for a premium, responsive UI.
- **Lucide React**: Beautiful, consistent iconography.

---

## ⚙️ How It Works

1. **Demand Forecasting**: Managers define the required roles and shift timings based on expected foot traffic.
2. **Constraint Modeling**: The backend translates business rules (budget caps, role requirements) and labor laws (overtime limits, mandatory rest) into a mathematical model.
3. **Optimization Engine**: Google OR-Tools evaluates millions of permutations to find the optimal assignment of employees to shifts.
4. **Execution**: The generated roster is published. Employees can view their schedules via their personalized dashboard and request swaps or leaves, feeding new constraints back into the engine.

---

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- PostgreSQL
- Redis Server

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jeyaguru018/ScheduleIQ.git
   cd ScheduleIQ
   ```

2. **Backend Setup**
   ```bash
   cd scheduleiq-backend
   mvn clean install
   # Configure application.yml with your Postgres and Redis credentials
   mvn spring-boot:run
   ```

3. **Frontend Setup**
   ```bash
   cd ../scheduleiq-frontend
   npm install
   npm run dev
   ```

---

<div align="center">
  Built with ❤️ for modern workforce management.
</div>
