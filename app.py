from flask import Flask, render_template, request, jsonify
import os
import whisper
from deep_translator import GoogleTranslator
from transformers import pipeline
import nltk

# Ensure NLTK is initialized
nltk.download("punkt")

app = Flask(__name__, static_folder="static")

UPLOAD_FOLDER = "static/uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Load Whisper Model (tiny for speed, medium/large for accuracy)
whisper_model = whisper.load_model("small")

# Load Summarization Model
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.json
    text = data.get("text", "")
    text_language = data.get("text_language", "en")

    if not text:
        return jsonify({"error": "No text provided"})

    # Summarize text if it's long enough
    if len(text.split()) > 50:
        summary = summarizer(text, max_length=1000, min_length=30, do_sample=False)[0]["summary_text"]
    else:
        summary = text  # No need to summarize short text

    # Translate the text
    translated_text = GoogleTranslator(source="auto", target=text_language.lower()).translate(text)

    return jsonify({"summary": summary, "translation": translated_text})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    transcript = ""
    translated_text = ""
    summarized_text = ""

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"})

    file = request.files['file']
    audio_language = request.form.get('audio_language', 'en')

    if file:
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        # Process audio with Whisper
        result = whisper_model.transcribe(file_path)
        transcript = result["text"]

        # Summarize Transcription
        if len(transcript.split()) > 50:
            summarized_text = summarizer(transcript, max_length=100, min_length=30, do_sample=False)[0]["summary_text"]
        else:
            summarized_text = transcript

        # Translate Full Transcription
        translated_text = GoogleTranslator(source="auto", target=audio_language.lower()).translate(transcript)

        return jsonify({"transcript": transcript, "summary": summarized_text, "translated": translated_text})

if __name__ == '__main__':
    app.run(debug=True)