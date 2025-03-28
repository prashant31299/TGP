# Women Safety Web App 🚀

## 📌 Overview
This is a **smart security web application** designed to enhance women's safety by providing **instant SOS alerts, real-time tracking, AI-based threat detection, and community-driven safety insights**.

## 🎯 Features
- ✅ **Instant SOS Alerts** – Send an emergency alert with real-time location to pre-saved contacts.
- ✅ **Live Tracking** – Displays user’s real-time location on a Google Map.
- ✅ **AI-Based Threat Detection** – Detects distress words via speech-to-text API.
- ✅ **Community Reports** – Users can mark safe/unsafe places on a map.
- ✅ **Panic Mode** – Shake phone or press a button multiple times to auto-trigger SOS.

## 🛠 Tech Stack
- **Frontend:** React.js (for UI & interactive components)
- **Backend:** Node.js + Express.js (for API handling)
- **Database:** Firebase (to store SOS alerts & reports)
- **Location Tracking:** Google Maps API (for real-time tracking)
- **AI Threat Detection:** Google ML Kit (for detecting distress words in voice)

## 🚀 Installation & Setup
### 1️⃣ Clone the Repository
```sh
git clone https://github.com/your-repo/women-safety-app.git
cd women-safety-app
```

### 2️⃣ Install Dependencies
```sh
npm install
```

### 3️⃣ Set Up Environment Variables
Create a `.env` file and add your API keys:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_FIREBASE_CONFIG=your_firebase_config
REACT_APP_TWILIO_API_KEY=your_twilio_api_key
```

### 4️⃣ Run the App
```sh
npm start
```
The app will be available at **http://localhost:3000**

## 📌 Usage
1️⃣ **Press the SOS button** to send an emergency alert.
2️⃣ **Enable live tracking** for real-time location updates.
3️⃣ **Report unsafe locations** to help others stay informed.
4️⃣ **Use voice detection** to trigger an automatic SOS if distress words are spoken.

## 🌍 Deployment
To deploy the app, use **Vercel or Netlify**:
```sh
npm run build
vercel deploy  # For Vercel
netlify deploy # For Netlify
```

## 🛠 Future Enhancements
- 🔹 Smartwatch integration for **quick SOS triggers**
- 🔹 AI-powered **facial recognition for threat detection**
- 🔹 Chatbot for **emergency guidance**

## 📝 License
This project is **open-source** under the MIT License.

---

💡 **Contribute & Make a Difference!** If you'd like to contribute, feel free to **fork the repo** and submit a PR. Let's make the world a safer place! ✨
