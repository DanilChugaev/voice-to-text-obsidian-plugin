import sys
import wave
from vosk import Model, KaldiRecognizer

def transcribe_audio(audio_path, model_path="/Users/oskelly/Documents/obsidian-store/oskelly/vosk-model-small-ru-0.22"):
	# Загружаем модель
	model = Model(model_path)
	recognizer = KaldiRecognizer(model, 16000)  # 16 кГц — стандартная частота

	# Открываем аудиофайл
	with wave.open(audio_path, "rb") as wf:
		if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
			print("Audio file must be WAV format mono PCM 16-bit 16kHz")
			sys.exit(1)

		# Читаем данные и распознаём
		while True:
			data = wf.readframes(4000)
			if len(data) == 0:
				break
			if recognizer.AcceptWaveform(data):
				result = recognizer.Result()
				print(result.split('"text" : "')[1].split('"')[0])  # Извлекаем текст
			# else:
			#     print(recognizer.PartialResult())  # Промежуточные результаты (опционально)

		# Финальный результат
		final_result = recognizer.FinalResult()
		text = final_result.split('"text" : "')[1].split('"')[0]
		print(text)

if __name__ == "__main__":
	if len(sys.argv) != 2:
		print("Usage: python transcribe_vosk.py <audio_path>")
		sys.exit(1)

	audio_path = sys.argv[1]
	transcribe_audio(audio_path)
