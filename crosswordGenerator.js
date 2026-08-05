import generateLayout from "crossword-layout-generator";

// ----------------------
// Your questions
// ----------------------
const words = [
  {
    answer: "SOLOMON",
    clue: "The king who built the first temple in Jerusalem. (1 Kings 6:1)"
  },
  {
    answer: "ELIJAH",
    clue: "The prophet who challenged the prophets of Baal on Mount Carmel. (1 Kings 18:20–40)"
  },
  {
    answer: "ELISHA",
    clue: "The prophet who succeeded Elijah. (2 Kings 2:9–15)"
  },
  {
    answer: "AHAB",
    clue: "The king of Israel married to Jezebel. (1 Kings 16:29–31)"
  },
  {
    answer: "JEZEBEL",
    clue: "The queen who promoted Baal worship in Israel. (1 Kings 16:31)"
  },
  {
    answer: "BAAL",
    clue: "The false god worshipped during Ahab's reign. (1 Kings 18:21)"
  },
  {
    answer: "CARMEL",
    clue: "The mountain where Elijah proved the Lord is God. (1 Kings 18:19–39)"
  },
  {
    answer: "RAVEN",
    clue: "The bird God used to feed Elijah. (1 Kings 17:4–6)"
  },
  {
    answer: "WIDOW",
    clue: "The woman of Zarephath who fed Elijah. (1 Kings 17:8–16)"
  },
  {
    answer: "NAAMAN",
    clue: "The Syrian commander healed of leprosy. (2 Kings 5:1–14)"
  },
  {
    answer: "GEHAZI",
    clue: "Elisha's servant who became leprous. (2 Kings 5:20–27)"
  },
  {
    answer: "JEHU",
    clue: "The king who destroyed Ahab's dynasty. (2 Kings 9:6–10)"
  },
  {
    answer: "JOSIAH",
    clue: "The king who repaired the temple and found the Book of the Law. (2 Kings 22:8–13)"
  },
  {
    answer: "HILKIAH",
    clue: "The high priest who found the Book of the Law. (2 Kings 22:8)"
  },
  {
    answer: "TEMPLE",
    clue: "The house of the Lord built by Solomon. (1 Kings 6:38)"
  },
  {
    answer: "OMRI",
    clue: "The king who built Samaria as Israel's capital. (1 Kings 16:24)"
  },
  {
    answer: "ASA",
    clue: "The king of Judah who removed many idols. (1 Kings 15:11–14)"
  },
  {
    answer: "JOASH",
    clue: "The king who repaired the temple. (2 Kings 12:4–15)"
  },
  {
    answer: "SAMARIA",
    clue: "The capital city of the northern kingdom. (1 Kings 16:24)"
  },
  {
    answer: "JERICHO",
    clue: "The city whose water Elisha healed. (2 Kings 2:19–22)"
  }
];

// ----------------------
// Generate until every word fits
// ----------------------

let crossword;
let attempts = 0;
const MAX_ATTEMPTS = 100;

do {
    crossword = generateLayout.generateLayout(words);
    attempts++;
} while (
    crossword.result.some(word => word.orientation === "none") &&
    attempts < MAX_ATTEMPTS
);

if (crossword.result.some(word => word.orientation === "none")) {

    console.log("Could not place these words:");

    crossword.result
        .filter(word => word.orientation === "none")
        .forEach(word => console.log(word.answer));

    throw new Error("Crossword generation failed.");
}

console.log(`Generated successfully after ${attempts} attempt(s)!`);

// ----------------------
// Build solution grid
// ----------------------

const SIZE = Math.max(crossword.rows, crossword.cols);

const solution_grid = Array.from(
    { length: SIZE },
    () => Array(SIZE).fill(null)
);

const across = [];
const down = [];

crossword.result.forEach(word => {

    const row = word.starty - 1;
    const col = word.startx - 1;

    [...word.answer].forEach((letter, i) => {

        if (word.orientation === "across") {
            solution_grid[row][col + i] = letter;
        } else {
            solution_grid[row + i][col] = letter;
        }

    });

    const clue = {
        number: word.position,
        text: word.clue,
        answer: word.answer,
        row,
        col,
        length: word.answer.length
    };

    if (word.orientation === "across") {
        across.push(clue);
    } else {
        down.push(clue);
    }

});

// ----------------------
// Final puzzle object
// ----------------------

const puzzle = {
    stage_id: 1,
    title: "1 & 2 Kings",
    solution_grid,
    clues: {
        across,
        down
    }
};

console.log(JSON.stringify(puzzle, null, 2));