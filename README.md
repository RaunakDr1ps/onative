# Onative

A real-time location-based social platform where users can share and discover hyper-local updates directly on an interactive map.

Instead of posting to a traditional social feed, users drop pins at specific geographic locations. Each pin contains a message and category, allowing nearby users to see what's happening around them in real time.

LIVE DEMO

onative.vercel.app

FEATURES

* Interactive map-based interface
* Location-specific posts
* Real-time updates using WebSockets
* Category-based filtering
* Search locations worldwide
* Auto-expiring posts
* Marker clustering for better performance
* Viewport-based loading for efficient data retrieval
* User login with custom usernames


CATEGORIES

Users can create posts under categories such as:

* Vibe
* Alert
* Event
* Food
* Traffic

This helps organize local information and makes discovery easier for nearby users.


TECH STACK

FRONT END

* React
* Vite
* React-Leaflet
* OpenStreetMap
* Leaflet Marker Clustering

BACKEND

* FastAPI
* Python
* WebSockets
* SQLite


HOW IT WORKS

1. Users choose a username and enter the platform.
2. Users can navigate the interactive map.
3. Clicking a location allows them to create a post.
4. Posts appear as map pins.
5. Nearby users receive updates in real time.
6. Pins automatically expire after a predefined period to keep information fresh.


WHAT I LEARNED

Through this project, I gained practical experience with:

* Frontend and backend integration
* REST API design
* WebSocket-based real-time communication
* Geolocation and map rendering
* State management in React
* Database operations with SQLite
* Deployment workflows
* Performance optimization techniques such as marker clustering and viewport-based loading

FUTURE IMPROVEMENT

* User authentication
* Image uploads
* Comments and reactions
* Friend and community system
* Mobile application
* Push notifications
* AI-powered local recommendations

INSTALLATION

CLONE THE REPOSITORY

git clone <repository-url>

FRONTEND

cd frontend
npm install
npm run deV

BACKEND

cd backend
pip install -r requirements.txt
uvicorn main:app --reload


PROJECT GOAL

The goal of Onative is to create a live digital pulse of local communities where people can instantly share and discover relevant information happening around them.

AUTHOR

Raunak Sharma

Aspiring Software Developer | BCA (AI & ML) Student | Learning Full-Stack Development

GitHub: https://github.com/RaunakDr1ps
