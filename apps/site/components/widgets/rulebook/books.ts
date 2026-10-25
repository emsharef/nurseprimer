// The rulebooks of the Second Night. Shared by the widgets and by the test that pins the chapter's numbers.

/** Where the reader starts: the First Night's one rule. */
export const FIRST_RULE = `# Wick reads from the top. First match wins.
if "purple" -> urgent
otherwise -> can wait`;

/** The patches Bea suggests, in the order the chapter offers them. New patches go on top. */
export const PATCHES = [
  { id: 'felt', label: 'felt tip', line: 'if "felt tip" -> can wait' },
  { id: 'glass', label: 'glass, dont', line: 'if "glass" and "dont" -> urgent' },
  { id: 'fit', label: 'fits and floppy', line: 'if any of "fit", "floppy", "hard to wake" -> urgent' },
] as const;

/** By three o'clock: forty-one rules, each one a patch on the one before. */
export const THREE_OCLOCK = `# Three o'clock. First match wins.
if "felt tip" -> can wait
if "blackcurrant" -> can wait
if any of "ice lolly", "lolly", "slush*", "crayon" -> can wait
if "glass" and any of "spots", "dots", "rash", "marks" and any of "dont fade", "dont go", "didnt fade", "didnt go" -> urgent
if "glass" and any of "spots", "dots", "rash", "marks" and any of "still there", "still see", "not fading", "not going" -> urgent
if "glass" and any of "spots", "dots", "rash", "marks" and any of "stay*", "wont go", "never fade" -> urgent
if any of "goes pale", "went pale", "goes white", "went white", "fades", "faded", "disappear*" -> can wait
if any of "chickenpox", "chicken pox" and not "glass" and not "neck" -> can wait
if any of "had a fit", "sort of fit", "having a fit" and not "not had a fit" and not "hasnt had a fit" -> urgent
if any of "seizure", "convuls*", "eyes rolled" -> urgent
if any of "stiff neck", "neck is stiff", "neck stiff", "neck all stiff", "neck hurts" -> urgent
if any of "wont put his chin", "wont put her chin", "wont put her head", "wont look down", "wont bend" -> urgent
if any of "light hurts", "hurts her eyes", "hurts his eyes", "bright light", "covering her eyes", "covering his eyes" -> urgent
if any of "floppy", "hard to wake", "cant wake", "wont wake", "barely wake", "to wake up" -> urgent
if any of "not responding", "not answering", "not herself at all", "not himself at all" -> urgent
if any of "breathing fast", "really fast", "struggling to breathe", "grunting", "sucking in" -> urgent
if any of "blue lips", "lips are blue", "lips look blue", "bluish", "blue ish", "grey*", "gray" -> urgent
if any of "mottled", "blotchy", "very pale", "gone pale" and not "pinky" -> urgent
if any of "high pitched", "weak cry", "thin", "not his normal cry", "not her normal cry", "not her usual cry" -> urgent
if any of "wont feed", "not feeding", "refusing", "wont take" -> urgent
if any of "dry nappy", "nappy has been dry", "nappys been dry", "no wee", "not had a wee", "bone dry" -> urgent
if "12 hours" and any of "wee", "nappy" -> urgent
if any of "cold hands", "hands and feet are", "like ice", "ice cold", "freezing" -> urgent
if any of "shivering", "shivery" and "cold" -> urgent
if any of "soft spot", "fontanelle" -> urgent
if any of "1 month", "2 months", "3 weeks", "4 weeks", "5 weeks", "6 weeks", "7 weeks", "8 weeks", "newborn" and any of "38", "39", "40" -> urgent
if any of "3 months", "4 months", "5 months", "6 months" and any of "39", "40" -> urgent
if any of "4 month", "5 month", "3 month" and any of "39", "40" -> urgent
if any of "dark red", "purply", "purplish", "bruis*" and "glass" -> urgent
if "purple" and any of "spots", "dots" -> urgent
if any of "pinprick", "pin prick" -> urgent
if any of "sleepy", "drowsy" and "not like" -> urgent
if "ambulance" -> urgent
if "neck" and any of "fine", "no bother", "no problem", "chin down" -> can wait
if any of "no fit", "no fits", "any fit" -> can wait
if "rash" and "glass" -> urgent
if "dont think" and "glass" -> urgent
if "purple" -> urgent
if "spots" and "legs" -> urgent
if "dots" -> urgent
otherwise -> can wait`;

/** Ten past three: a mother's message with a word no rule has met. */
export const SPECKLY = "sorry its so late. my son is 2 and hes really hot, and his legs have gone all speckly. i pressed a glass on them like you're meant to and you can still see them through it";
