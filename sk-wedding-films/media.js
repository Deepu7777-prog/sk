/*
  SK WEDDING FILMS - MEDIA LIST
  ------------------------------------------------------------
  This is the only file you edit to add photographs, films and reels.
  Put image files in the  images/  folder and video files in  videos/ .
  The first three photos are also shown in "Featured Stories" on the home page.

  PHOTO categories used so far: "Candid Photography", "Couple Photography", "Portrait Photography".
  Any other category name you type becomes a new filter button automatically.
  Suggested: "Wedding Photography", "Bridal Photography", "Groom Photography", "Pre-Wedding Photography",
             "Wedding Rituals", "Family Photography", "Creative Photography".

  FILM categories used so far: "Maternity Shoot", "Wedding Teasers", "Wedding Cinematic Films".
  Suggested: "Pre-Wedding Films", "Wedding Highlights", "Function Teasers", "Event Videos".

  ADD A PHOTO:   { src: "images/name.jpg", category: "Wedding Photography", alt: "What is in the photo", width: 1200, height: 1600 },
  ADD A FILE FILM:  { type: "file", src: "videos/name.mp4", poster: "images/name.jpg", title: "Title", description: "", category: "Wedding Highlights" },
  ADD A YOUTUBE FILM:  { type: "youtube", id: "VIDEO_ID", title: "Title", description: "", category: "Wedding Highlights" },
       (VIDEO_ID is the part after v= in youtube.com/watch?v=VIDEO_ID)
  ADD A REEL (vertical):  { type: "file", src: "videos/reel.mp4", poster: "images/reel.jpg", caption: "Haldi" }
       or { type: "instagram", id: "REEL_CODE", caption: "..." }   (instagram.com/reel/REEL_CODE/)
       or { type: "youtube", id: "SHORT_ID", caption: "..." }      (youtube.com/shorts/SHORT_ID)
  Sections with nothing in them (Reels, School Events) stay hidden until you add something.
*/
window.SK_MEDIA = {
  hero: { type: "image", src: "images/ritual-candid.jpg" },
  portrait: { src: "images/sathish-portrait.jpg", alt: "Sathish Kumar holding his camera at a wedding" },

  photos: [
    { src: "images/ritual-candid.jpg", category: "Candid Photography", alt: "A couple seated before a decorated goddess idol during a traditional ritual", width: 1280, height: 852 },
    { src: "images/couple-maternity.jpg", category: "Couple Photography", alt: "Maternity shoot: a husband kissing his wife's baby bump in a traditional doorway", width: 1350, height: 1800 },
    { src: "images/portrait-halfsaree.jpg", category: "Portrait Photography", alt: "A girl in a traditional half saree posing on a tree-lined road", width: 1200, height: 1600 },
    { src: "images/portrait-guitar.jpg", category: "Portrait Photography", alt: "A toddler in a lavender butterfly dress standing beside a guitar at dusk", width: 1200, height: 1600 }
  ],

  films: [
    { type: "file", src: "videos/film-02.mp4", poster: "images/film-02.jpg", title: "Wedding Teaser", description: "", category: "Wedding Teasers" },
    { type: "file", src: "videos/film-03.mp4", poster: "images/film-03.jpg", title: "Saree Ceremony", description: "", category: "Wedding Cinematic Films" },
    { type: "file", src: "videos/film-01.mp4", poster: "images/film-01.jpg", title: "Maternity Shoot Film", description: "", category: "Maternity Shoot" }
  ],

  reels: [],

  editingCompare: [], // before/after: { before: "images/before.jpg", after: "images/after.jpg", label: "Colour grading" }

  school: [],         // { src, alt, category: "Student Activities" | "School Celebrations" | "Annual Functions" | "Special Events" | "School Programs" }
  schoolFilms: []
};
