import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./buffer-page.css";
import soundImg from "../../images/sound.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const client = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

function BufferPage() {
  const location = useLocation();
  const state = location.state;
  const navigate = useNavigate();
  const [transcriptionData, setTranscriptionData] = useState("");
  const [summaryData, setSummaryData] = useState("");

  useEffect(() => {
    if (state && state.videoLink) {
      // Process the video link
      processVideoLink(state.videoLink);

      // Simulate processing the video link
      // For testing, navigate directly
      /*
      setTimeout(() => {
        navigate("/audio-summary-transcription", { state: { contentType: 'video', contentData: state.videoLink } });
      }, 2000); // Mock delay
      */
    } else if (state && state.selectedFile) {
      // Process the selected file
      processSelectedFile(state.selectedFile);

      // Simulate processing the selected file
      // For testing, navigate directly
      /*
      setTimeout(() => {
        navigate("/audio-summary-transcription", { state: { contentType: 'audio', contentData: state.selectedFile } });
      }, 2000); // Mock delay
      */
    }
  }, [navigate, state]);

  function processVideoLink(videoLink) {
    // TODO: implement validation

    // Clean up the video link
    const videoId = videoLink.split("v=")[1].split("&")[0];
    videoLink = "https://www.youtube.com/watch?v=" + videoId;

    // Download audio and transcribe it
    // Download the audio from the video link
    DownloadAudio(videoLink).then((audioData) => {
      // Transcribe the audio data
      TranscribeAudioData(audioData)
        .then((transcriptionData) => {
          // Set transcription data to state
          setTranscriptionData(transcriptionData);

          // Summarize the transcription
          SummarizeTranscription(transcriptionData).then((summaryData) => {
            // Auto chapter the audio data
            AutoChapterAudioData(audioData).then((autoChapters) => {
              console.log("Chapters inside processVideoLink:", autoChapters);
              // Navigate to the summary and transcription page with all the data
              navigate("/audio-summary-transcription", {
                state: {
                  transcriptionData,
                  summaryData,
                  contentType: "video",
                  contentData: videoLink,
                  autoChapters, // Add autoChapters to the state
                },
              });
            });
          });
        })
        .catch((error) => {
          console.log("Error transcribing video link: " + error);
        });
    });
  }

  return (
    <div className="summary-page">
      <img className="sound-img" src={soundImg} alt="sound image" />
      <div className="text-description">
        We are processing your file. This may take <br></br>a few seconds.
      </div>
    </div>
  );

  async function processSelectedFile(selectedFile) {
    const formData = new FormData();
    formData.append("audio", selectedFile);

    try {
      // Transcribe the audio
      const response = await client.post("/transcribe-audio/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const transcriptionData = response.data.transcription;
      console.log("Transcription:", transcriptionData);
      setTranscriptionData(transcriptionData);

      // Summarize the transcription
      const summaryData = await SummarizeTranscription(transcriptionData);
      console.log("Summary:", summaryData);

      // // Get AssemblyAI auto chapters
      const autoChapters = await AutoChapterAudioData_Upload(selectedFile);
      console.log("Chapters:", autoChapters);

      // Navigate to the summary page
      // navigate("/audio-summary-transcription", {
      //   state: { transcriptionData, summaryData },
      // });

      navigate("/audio-summary-transcription", {
        state: {
          contentType: "audio",
          contentData: state.selectedFile,
          transcriptionData,
          summaryData,
          autoChapters,
        },
      });
    } catch (error) {
      console.error("Error processing audio file:", error);
    }
  }
}

async function DownloadAudio(videoLink) {
  try {
    console.log("Downloading audio");
    const response = await client.post("/download_Audio/", { url: videoLink });
    console.log("Audio downloaded");

    // Convert base64 string to Uint8Array
    const audioData = atob(response.data.audio_data);
    const uint8Array = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      uint8Array[i] = audioData.charCodeAt(i);
    }

    return uint8Array;
  } catch (error) {
    console.log("Error calling downloadAudio: " + error);
  }
}

async function TranscribeAudioData(audioData) {
  try {
    // Convert Uint8Array to Blob
    const audioArrayBuffer = audioData.buffer;
    const audioBlob = new Blob([audioArrayBuffer], { type: "audio/wav" });

    // Send audio blob to backend
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");
    const transcrptionResponse = await client.post(
      "/transcribe-audio/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return transcrptionResponse.data.transcription;
  } catch (error) {
    console.log("Error calling transcribeAudio: " + error);
  }
}

async function SummarizeTranscription(transcriptionData) {
  try {
    const response = await client.post("/summarize/", {
      text: transcriptionData,
      summaryType: "paragraph",
    });
    return response.data.summary;
  } catch (error) {
    console.log("Error calling summarizeTranscription: " + error);
  }
}

async function AutoChapterAudioData(audioData) {
  try {
    // Convert Uint8Array to Blob
    const audioBlob = new Blob([audioData], { type: "audio/wav" }); // Adjust MIME type as necessary

    // Create a new FormData object to send the audio file
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "audio.wav"); // You may choose a different file name

    // Make a POST request to the auto_chapter endpoint
    const response = await client.post("/auto_chapter/", formData);

    if (response.status === 200) {
      return response.data.chapters;
    } else {
      console.error("Error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("API call error in auto chaptering:", error);
  }
}

async function AutoChapterAudioData_Upload(audioFile) {
  try {
    // Create a new FormData object to send the audio file
    const formData = new FormData();
    formData.append("audio_file", audioFile);

    // Make a POST request to the auto_chapter endpoint
    const response = await client.post("/auto_chapter/", formData);

    if (response.status === 200) {
      return response.data.chapters;
    } else {
      console.error("Error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("API call error: ", error);
  }
}

export default BufferPage;
