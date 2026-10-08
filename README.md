# SpaceShip

A small web app that replaces the paper loyalty card at a co-working space. The owner checks customers in and out and the bill is worked out for them; each customer follows their own hours and points through a private link.

**Live product:** <https://space-ship-eight.vercel.app>

## Try it

The link opens the owner's sign-in screen. Sign in with:

| | |
|---|---|
| Username | `guiChiLanAnh` |
| Password | `lan@nhstudynook2025` |

A good first run: add a space type under **Prices**, add a customer under **Customers** (you get their private link and QR code), then **Check in** and **Check out** from **Seated**. Open the customer's link in another tab to see what they see.

Customers never see the sign-in screen: each one gets their own private link (`/s/…`) from the owner.

## The idea

A co-working space run by an owner I know well gives its customers a physical card for collecting loyalty points. I wanted to replace that card with something the owner and the customers can both use from a phone.

SpaceShip moves the card online and takes over the bill at the same time:

- **For the owner:** press *Check in* when a customer sits down and *Check out* when they leave. The app rounds the time, applies the right price (hourly, a combo, or a full day), subtracts a discount campaign if the owner picks one, and awards a loyalty point when the stay is long enough.
- **For the customer:** one link shows when they checked in, their past sessions, total hours, and points. Nothing to install and no account to create.

## How it was built

- **One person**, working in collaboration with an AI coding assistant.
- **Two to three days**, from the first document to a deployed product.

Those two limits shaped every decision below.

## Phase 1 decisions

The goal of Phase 1 was a working loop the owner can use at the counter, not a complete product.

| Decision | Why |
|---|---|
| **One owner account with simple sign-in** (a single username and password) | There is one owner. Roles, staff accounts and password reset would have taken a large share of the time without changing what the owner can do on day one. |
| **Customers use a private link instead of an account or an app** | Customers are reluctant to install an app or register just to see a point balance. A link works on any phone straight away, and it can be shared as a QR code at the counter. |
| **The customer page is read-only** | Everything that changes data goes through the owner, so the link can stay simple and safe to share. |
| **Prices, campaigns and thresholds are data the owner edits** | The owner can change a price or add a room without asking a developer. |
| **Each bill is frozen when the session closes** | Changing prices later never rewrites what a past customer was charged. |

## Where it could go next

- **More ways for customers to follow along:** email updates, a customer app, or a web app for staff. The private link is the Phase 1 answer, not the final one.
- **Redeeming points** for a free full-day card.
- **Proper owner and staff accounts.**
- Correcting a session after the fact, room booking, and revenue reports.

The full list is in the scope section of the business rules document.

## More documentation

| Document | What it covers |
|---|---|
| [Business rules and flows](SpaceShip_Business_Rules_and_Flows.md) | How pricing, discounts and points work, and the step-by-step flows for the owner and the customer |
| [Database schema](SpaceShip_DB_Schema%20%281%29.md) | Every table and field, and how they relate |

## What is in this repository

| Folder | Contents |
|---|---|
| [`spaceship_BE/`](spaceship_BE/) | The API: Python, FastAPI, SQLAlchemy, PostgreSQL. Deployed on Railway. |
| [`spaceship_FE/`](spaceship_FE/) | The web app: React, TypeScript, Vite, Tailwind CSS. Deployed on Vercel. |

## Running it locally

You need Docker, Python 3.13 and Node.js.

**1. Database and API** (in `spaceship_BE/`):

```powershell
copy .env.example .env          # then fill in the values
docker compose up -d            # starts PostgreSQL
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head            # creates the tables
python -m scripts.seed          # optional: sample space types and campaigns
uvicorn app.main:app --reload   # http://localhost:8000, docs at /docs
```

For local use, `.env` needs:

```
DATABASE_URL=postgresql+psycopg://spaceship:spaceship@localhost:5432/spaceship
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-password
PUBLIC_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
ENABLE_DOCS=true
```

`ENABLE_DOCS=true` opens the interactive API documentation at `/docs`. It is switched off on the live site.

**2. Web app** (in `spaceship_FE/`):

```powershell
npm install
npm run dev                     # http://localhost:5173
```

Sign in with the username and password from `.env`.

**Tests** (in `spaceship_BE/`): `pytest`
