# NoteTaker: Smart Note Digitizer & OCR Engine 🖋️📱

A full-stack mobile application that bridges the gap between physical handwriting and digital text. NoteTaker allows users to create, digitize, and share handwritten notes in real-time. It features a custom-engineered Computer Vision pipeline designed specifically to solve the challenge of OCR fragmentation in fast, disconnected cursive and hybrid handwriting.

## ✨ Key Features:
 - Hybrid Handwriting Recognition: Accurately extracts both print and cursive text from digital and physical mediums.
 - Advanced CV Pipeline: Utilizes a custom OpenCV preprocessing pipeline featuring gamma correction and morphological erosion to reconstruct faint strokes and fragmented cursive topology.
 - Spatial Sorting Algorithm: Integrates with PaddleOCR using a custom coordinate-based sorting mechanism to strictly enforce top-to-bottom reading order, resolving alignment artifacts in multi-line documents.
 - In-App Note Management: Create, edit, and manage digitized notes directly within the mobile interface.
 - Seamless Sharing: Export and share extracted text instantly.

## 🛠️ Tech Stack

Frontend:
 - React Native (Expo)
 - TypeScript / JavaScript

Backend & ML:
 - Python 3
 - FastAPI
 - OpenCV (Image Processing)
 - PaddleOCR (Optical Character Recognition)

## 📁 Project Structure

```text
NoteTaker/
├── backend/               # FastAPI server and Computer Vision pipeline
│   ├── app/
│   │   ├── main.py        # API routing and sorting logic
│   │   ├── image_proc.py  # OpenCV pipeline (Gamma, Erosion, Dilation)
│   │   └── database.py    # Note storage and retrieval
│   └── requirements.txt
└── frontend/              # React Native mobile application
    ├── App.tsx            # Main application UI and camera logic
    ├── package.json
    └── app.json
```
    
## 🚀 Installation & Setup

### Prerequisites
Node.js & npm

Python 3.8+

Expo Go app installed on your iOS/Android device

Backend Setup:
Navigate to the backend directory and set up your Python environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
Start the FastAPI development server:
```

```bash
# We run on 0.0.0.0 so the mobile device can access it over the local network
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend Setup:
Open a new terminal window, navigate to the frontend directory, and install dependencies:

```bash
cd frontend
npm install
Start the Expo development server:
```

```bash
npx expo start
```
Note: Ensure your mobile device and computer are on the same Wi-Fi network. Scan the QR code in the terminal using the Expo Go app.


## 🧠 The Computer Vision Pipeline
Standard OCR engines struggle with fast digital handwriting because the strokes often disconnect or fade, causing the engine to read letters as isolated, random characters (e.g., reading "how" as "now" or "roh").

NoteTaker solves this before the image ever reaches the OCR engine:

Gamma Correction: Mathematically darkens faint grey ink into solid black without introducing noise.

Morphological Erosion (The "Bold" Effect): Physically thickens the strokes to bridge the gaps in disconnected cursive without filling in the loops of letters like 'd' or 'o'.

Adaptive Padding: Centers the text on a large white canvas to reset the OCR engine's spatial awareness.

Coordinate Sorting: Forces the OCR to read text blocks by their strict Y-axis coordinates, preventing multi-line overlap errors.

🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

📄 License
MIT
