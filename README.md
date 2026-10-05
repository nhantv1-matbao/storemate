# Urban Brew - Operations Management

A unified, full-stack application built for the Vibehost Challenge. This system integrates HR Management, Inventory Tracking, and Store Checklist operations into a single platform.

## Features

- **HR Management:** Add, edit, and remove employees. Track their branches, shifts, and positions.
- **Inventory Tracking (New Module):** Monitor stock levels of raw materials and packaging per branch. Quickly increment or decrement quantities.
- **Store Checklists:** Daily task tracking for different store branches to ensure operational standards.
- **Unified Interface:** A modern, responsive single-page application built with Tailwind CSS.

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL (with `pg` module)
- **Frontend:** HTML5, Tailwind CSS, Vanilla JS
- **Logo Design:** Fictional "Urban Brew" brand with custom generated logo.

## Setup & Deployment (Vibehost)

1. **Environment Variables:** Set the `DATABASE_URL` in your Vibehost environment to point to your PostgreSQL instance.
2. **Installation:** Run `npm install` to install dependencies.
3. **Database Initialization (Required once):** Run `npm run init-db` to create the database tables and seed them with realistic mock data.
4. **Start Server:** Run `npm start` to launch the application.

## Local Development

1. Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user_75590814a882:YLa7EDjZj1Z-vpAc8op0hMkqpDjRpEnZ@vays-db-37b33696-postgresql-5432:5432/postgresql_instance
   PORT=3000
   ```
2. Run `npm install`
3. Run `npm run init-db`
4. Run `npm start`
5. Open `http://localhost:3000` in your browser.
