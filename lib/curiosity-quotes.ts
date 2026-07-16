export type CuriosityQuoteTone = "acid" | "coral" | "paper" | "sky" | "lavender";

export type CuriosityQuote = {
  id: string;
  text: string;
  attribution: string;
  context?: string;
  sourceLabel: string;
  sourceUrl: string;
  tone: CuriosityQuoteTone;
};

/**
 * Source-backed landing-page copy. Keep excerpts sticker-short and provide a
 * useful read-more destination. Static editorial content belongs in version
 * control; it does not need a database or CMS lifecycle.
 */
export const CURIOSITY_QUOTES: readonly CuriosityQuote[] = [
  { id: "feynman-deeper-mystery", text: "With more knowledge comes deeper, more wonderful mystery.", attribution: "Richard Feynman", context: "physicist", sourceLabel: "The Value of Science · Caltech", sourceUrl: "https://calteches.library.caltech.edu/1575/", tone: "acid" },
  { id: "shahidi-curiosity-lead", text: "Let curiosity lead.", attribution: "Yara Shahidi", context: "actor + producer", sourceLabel: "TED2023", sourceUrl: "https://www.ted.com/talks/yara_shahidi_let_curiosity_lead", tone: "coral" },
  { id: "jobs-following-curiosity", text: "What I stumbled into by following my curiosity and intuition turned out to be priceless later on.", attribution: "Steve Jobs", context: "on an unexpected calligraphy class", sourceLabel: "Stanford address · Steve Jobs Archive", sourceUrl: "https://stevejobsarchive.com/stories/stay-hungry-stay-foolish", tone: "paper" },
  { id: "montessori-lifetime-curiosity", text: "A greater curiosity arises, which can never be satiated; so will last through a lifetime.", attribution: "Maria Montessori", context: "educator + physician", sourceLabel: "To Educate the Human Potential · AMI", sourceUrl: "https://montessori-ami.org/resource-library/quotes/montessori-6-12", tone: "sky" },
  { id: "hawking-be-curious", text: "Look up at the stars. Try to make sense of what you see. Be curious.", attribution: "Stephen Hawking", context: "physicist", sourceLabel: "University of Cambridge", sourceUrl: "https://www.cam.ac.uk/news/stephen-hawking-in-paralympics-opening-ceremony", tone: "lavender" },
  { id: "xkcd-lucky-ten-thousand", text: "You’re one of today’s lucky 10,000.", attribution: "Randall Munroe", context: "xkcd · celebrating first discoveries", sourceLabel: "Ten Thousand · xkcd", sourceUrl: "https://xkcd.com/1053/", tone: "acid" },
  { id: "braincraft-rabbit-hole", text: "Don’t hesitate to find a rabbit hole and go down in it.", attribution: "Vanessa Hill", context: "BrainCraft", sourceLabel: "The Power of Curiosity · PBS", sourceUrl: "https://www.pbs.org/video/the-power-of-curiosity-xb3qql/", tone: "coral" },
  { id: "adam-minimum-age", text: "Why do we put a minimum age on learning?", attribution: "Adam El Rafey", context: "asked at age 8", sourceLabel: "Never underestimate an 8 year old! · TEDx", sourceUrl: "https://www.ted.com/talks/adam_el_rafey_never_underestimate_an_8_year_old", tone: "paper" },
  { id: "ada-nerdy-dream", text: "I know this career sounds nerdy to a lot of kids, but to me it’s my dream.", attribution: "Ada Kanapskyte", context: "written at age 10", sourceLabel: "Space Life Sciences profile · NASA", sourceUrl: "https://www.nasa.gov/wp-content/uploads/2021/04/slstp_profile_book_2020_0.pdf", tone: "sky" },
  { id: "mainzer-science-everyone", text: "Science is for everyone.", attribution: "Amy Mainzer", context: "NASA/JPL astronomer", sourceLabel: "It’s fun, no kidding · JPL", sourceUrl: "https://www.jpl.nasa.gov/universe/archive/universe1604.pdf", tone: "lavender" },
  { id: "alice-curiouser", text: "Curiouser and curiouser!", attribution: "Alice", context: "the original rabbit-hole explorer", sourceLabel: "Alice’s Adventures in Wonderland", sourceUrl: "https://www.gutenberg.org/files/11/11-h/11-h.htm", tone: "acid" },
  { id: "stark-wonderful-rabbit-holes", text: "Fiction writers get to dive down wonderful rabbit holes.", attribution: "Kio Stark", context: "author + independent-learning advocate", sourceLabel: "Speaker profile · TED", sourceUrl: "https://www.ted.com/speakers/kio_stark", tone: "coral" },
  { id: "sheehy-pointless-research", text: "Seemingly pointless scientific research can lead to extraordinary discoveries.", attribution: "Suzie Sheehy", context: "physicist", sourceLabel: "The case for curiosity-driven research · TED", sourceUrl: "https://www.ted.com/talks/suzie_sheehy_the_case_for_curiosity_driven_research", tone: "paper" },
  { id: "mit-go-deeper", text: "When we work on something we care about, we go deeper, try harder, and learn more.", attribution: "MIT Lifelong Kindergarten", context: "creative-learning principle", sourceLabel: "Learning Creative Learning · MIT", sourceUrl: "https://lcl.media.mit.edu/", tone: "sky" },
  { id: "whole-earth-hungry-foolish", text: "Stay hungry. Stay foolish.", attribution: "Whole Earth Catalog", context: "later popularized by Steve Jobs", sourceLabel: "Original artifact · Steve Jobs Archive", sourceUrl: "https://stevejobsarchive.com/stories/stay-hungry-stay-foolish", tone: "lavender" },
  { id: "sagan-imagination", text: "Imagination will often carry us to worlds that never were. But without it we go nowhere.", attribution: "Carl Sagan", context: "planetary scientist", sourceLabel: "Carl Sagan Center dedication · NASA", sourceUrl: "https://science.nasa.gov/people/carl-sagan/", tone: "acid" },
  { id: "fox-love-questions", text: "The key to being a scientist is to love asking questions.", attribution: "Nicola Fox", context: "NASA science leader", sourceLabel: "Career spotlight · NASA", sourceUrl: "https://www.nasa.gov/learning-resources/career-spotlight-scientist/", tone: "coral" },
  { id: "garvin-never-wait", text: "Never wait to wonder.", attribution: "Jim Garvin", context: "NASA planetary scientist", sourceLabel: "People of NASA", sourceUrl: "https://www.nasa.gov/people-of-nasa/jim-garvin-catalyzing-the-engineering-of-science/", tone: "paper" },
  { id: "ennico-possibility", text: "Let us not kill curiosity, at any age, in any situation.", attribution: "Kimberly Ennico Smith", context: "NASA astrophysicist", sourceLabel: "The Curiosity Effect · NASA", sourceUrl: "https://ntrs.nasa.gov/citations/20170003217", tone: "sky" },
  { id: "space-place-thoughtful-action", text: "Science is curiosity in thoughtful action.", attribution: "NASA Space Place", context: "science for kids", sourceLabel: "What Is Science? · NASA", sourceUrl: "https://spaceplace.nasa.gov/science/en/", tone: "lavender" },
  { id: "gatebe-know-everything", text: "I’m always interested in knowing about everything.", attribution: "Charles Gatebe", context: "NASA climate scientist", sourceLabel: "Pushing the Limits of Curiosity · NASA", sourceUrl: "https://www.nasa.gov/people-of-nasa/charles-gatebe-pushing-the-limits-of-curiosity/", tone: "acid" },
  { id: "goddard-mars", text: "I imagined how wonderful it would be to make some device with the possibility of ascending to Mars.", attribution: "Robert Goddard", context: "remembering a vision at age 17", sourceLabel: "The Human Desire for Exploration · NASA", sourceUrl: "https://www.nasa.gov/history/the-human-desire-for-exploration-leads-to-discovery/", tone: "coral" },
  { id: "carson-child-world", text: "A child’s world is fresh and new and beautiful, full of wonder and excitement.", attribution: "Rachel Carson", context: "marine biologist + author", sourceLabel: "Aesthetics and a Sense of Wonder · ERIC", sourceUrl: "https://eric.ed.gov/?id=EJ913814", tone: "paper" },
  { id: "mackinnon-what-if", text: "What would happen if? was a favorite.", attribution: "Roderick MacKinnon", context: "Nobel laureate, remembering childhood", sourceLabel: "Biographical · Nobel Prize", sourceUrl: "https://www.nobelprize.org/prizes/chemistry/2003/mackinnon/biographical/", tone: "sky" },
  { id: "marshall-curiosity-research", text: "The best kind of research is curiosity-driven research.", attribution: "Barry Marshall", context: "Nobel laureate", sourceLabel: "Advice for Young Scientists · Nobel Prize", sourceUrl: "https://www.nobelprize.org/npii/videos/drive-choice-research-topic/", tone: "lavender" },
  { id: "parisi-children-curious", text: "If children are not curious they will not be able to work.", attribution: "Giorgio Parisi", context: "Nobel laureate", sourceLabel: "Nobel Prize Conversations", sourceUrl: "https://www.nobelprize.org/prizes/physics/2021/parisi/podcast/", tone: "acid" },
  { id: "rice-fundamental-curiosity", text: "I think it’s really just fundamental curiosity.", attribution: "Charles M. Rice", context: "Nobel laureate, on choosing science", sourceLabel: "Interview · Nobel Prize", sourceUrl: "https://www.nobelprize.org/prizes/medicine/2020/rice/169385-rice-interview-march-2021/", tone: "coral" },
  { id: "mayor-satisfy-curiosity", text: "Science is one very fabulous way to satisfy your curiosity.", attribution: "Michel Mayor", context: "Nobel laureate + astronomer", sourceLabel: "Interview · Nobel Prize", sourceUrl: "https://www.nobelprize.org/prizes/physics/2019/mayor/193266-mayor-interview-december-2019/", tone: "paper" },
  { id: "ramsdell-need-curious", text: "To be successful as a scientist, I think you really need to be curious.", attribution: "Fred Ramsdell", context: "Nobel laureate", sourceLabel: "Interview · Nobel Prize", sourceUrl: "https://www.nobelprize.org/prizes/medicine/2025/ramsdell/1925703-interview-transcript/", tone: "sky" },
] as const;

const FEATURED_CURIOSITY_QUOTE_IDS = [
  "feynman-deeper-mystery",
  "braincraft-rabbit-hole",
  "adam-minimum-age",
] as const;

/** A fixed, deliberately compact landing-page edit; the complete archive stays above. */
export const FEATURED_CURIOSITY_QUOTES = FEATURED_CURIOSITY_QUOTE_IDS.map((id) => {
  const quote = CURIOSITY_QUOTES.find((candidate) => candidate.id === id);
  if (!quote) throw new Error(`Missing featured curiosity quote: ${id}`);
  return quote;
});
