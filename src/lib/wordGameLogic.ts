export type LetterStatus = "correct" | "present" | "absent";

export type LetterResult = {
  letter: string;
  status: LetterStatus;
};

export function normalizeArabicWord(word: string): string {
  return word
    .trim()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "");
}

export function getArabicLetters(word: string): string[] {
  return [...normalizeArabicWord(word)];
}

export function isFiveLetters(word: string): boolean {
  return getArabicLetters(word).length === 5;
}

export function compareGuess(guess: string, answer: string): LetterResult[] {
  const guessLetters = getArabicLetters(guess);
  const answerLetters = getArabicLetters(answer);

  const results: LetterResult[] = guessLetters.map((letter) => ({
    letter,
    status: "absent",
  }));

  const usedAnswerIndexes = new Set<number>();

  // أولًا: الأخضر، الحرف صحيح وفي نفس المكان
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      results[i].status = "correct";
      usedAnswerIndexes.add(i);
    }
  }

  // ثانيًا: الأصفر، الحرف موجود لكن في مكان مختلف
  for (let i = 0; i < guessLetters.length; i++) {
    if (results[i].status === "correct") continue;

    const foundIndex = answerLetters.findIndex(
      (letter, index) =>
        letter === guessLetters[i] && !usedAnswerIndexes.has(index)
    );

    if (foundIndex !== -1) {
      results[i].status = "present";
      usedAnswerIndexes.add(foundIndex);
    }
  }

  return results;
}

export function isCorrectGuess(guess: string, answer: string): boolean {
  return normalizeArabicWord(guess) === normalizeArabicWord(answer);
}

export function getShareSquares(results: LetterResult[][]): string {
  return results
    .map((row) =>
      row
        .map((cell) => {
          if (cell.status === "correct") return "🟩";
          if (cell.status === "present") return "🟨";
          return "⬜";
        })
        .join("")
    )
    .join("\n");
}