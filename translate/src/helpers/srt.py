from typing import List, Dict

# Function to convert milliseconds to SRT timestamp format
def format_timestamp(ms: int) -> str:
  hours = str(ms // 3600000).zfill(2)
  minutes = str((ms % 3600000) // 60000).zfill(2)
  seconds = str((ms % 60000) // 1000).zfill(2)
  milliseconds = str(ms % 1000).zfill(3)
  return f"{hours}:{minutes}:{seconds},{milliseconds}"

def split_sentences(sentences: List[Dict[str, int]], max_length: int = 80) -> List[Dict[str, int]]:
  new_sentences = []

  for sentence in sentences:
    text, start, end = sentence['text'], sentence['start'], sentence['end']

    # If the sentence is within the max length, keep it as is
    if len(text) <= max_length:
      new_sentences.append(sentence)
    else:
      # Split sentence into smaller parts
      words = text.split(" ")
      parts = []
      current_part = ""

      for word in words:
        if len(current_part) + len(word) + 1 <= max_length:
          current_part += (" " if current_part else "") + word
        else:
          parts.append(current_part)
          current_part = word

      if current_part:
        parts.append(current_part)

      # Calculate time for each part
      total_time = end - start
      time_per_char = total_time / len(text)
      char_counts = [len(part) for part in parts]
      time_splits = [round(count * time_per_char) for count in char_counts]

      part_start = start
      for part, time_split in zip(parts, time_splits):
        part_end = part_start + time_split
        new_sentences.append({'text': part, 'start': part_start, 'end': part_end})
        part_start = part_end

  return new_sentences

# Function to generate SRT content from an array of subtitle objects
def generate_srt(data: List[Dict[str, int]], split: bool = True) -> str:
  subtitles = split_sentences(data) if split else data
  return "\n".join(
    f"{index + 1}\n{format_timestamp(start)} --> {format_timestamp(end)}\n{text}\n"
    for index, (start, end, text) in enumerate((sub['start'], sub['end'], sub['text']) for sub in subtitles)
  )
