// Israeli Cities and Neighborhoods for HomeKey Search Autocomplete
// Each city has English and Hebrew names, plus neighborhoods in both languages

const ISRAEL_LOCATIONS = [
  {
    city: { en: 'Tel Aviv', he: 'תל אביב' },
    neighborhoods: [
      { en: 'Florentin', he: 'פלורנטין' },
      { en: 'Neve Tzedek', he: 'נווה צדק' },
      { en: 'Rothschild', he: 'רוטשילד' },
      { en: 'Dizengoff', he: 'דיזנגוף' },
      { en: 'Ramat Aviv', he: 'רמת אביב' },
      { en: 'Old North', he: 'צפון ישן' },
      { en: 'New North', he: 'צפון חדש' },
      { en: 'Lev Tel Aviv', he: 'לב תל אביב' },
      { en: 'Kerem HaTeimanim', he: 'כרם התימנים' },
      { en: 'Shapira', he: 'שפירא' },
      { en: 'Jaffa', he: 'יפו' },
      { en: 'Neve Shaanan', he: 'נווה שאנן' },
      { en: 'HaTikva', he: 'התקווה' },
    ],
  },
  {
    city: { en: 'Jerusalem', he: 'ירושלים' },
    neighborhoods: [
      { en: 'Rehavia', he: 'רחביה' },
      { en: 'Talbiyeh', he: 'טלביה' },
      { en: 'German Colony', he: 'המושבה הגרמנית' },
      { en: 'Baka', he: 'בקעה' },
      { en: 'Katamon', he: 'קטמון' },
      { en: 'Har Nof', he: 'הר נוף' },
      { en: 'Ramot', he: 'רמות' },
      { en: 'Pisgat Zeev', he: 'פסגת זאב' },
      { en: 'Malha', he: 'מלחה' },
      { en: 'Gilo', he: 'גילה' },
      { en: 'Givat Shaul', he: 'גבעת שאול' },
      { en: 'Kiryat Moshe', he: 'קריית משה' },
      { en: 'Nachlaot', he: 'נחלאות' },
    ],
  },
  {
    city: { en: 'Haifa', he: 'חיפה' },
    neighborhoods: [
      { en: 'Carmel', he: 'כרמל' },
      { en: 'Ahuza', he: 'אחוזה' },
      { en: 'Merkaz HaCarmel', he: 'מרכז הכרמל' },
      { en: 'Hadar', he: 'הדר' },
      { en: 'Neve Shaanan', he: 'נווה שאנן' },
      { en: 'German Colony', he: 'המושבה הגרמנית' },
      { en: 'Bat Galim', he: 'בת גלים' },
      { en: 'Kiryat Eliezer', he: 'קריית אליעזר' },
    ],
  },
  {
    city: { en: 'Beer Sheva', he: 'באר שבע' },
    neighborhoods: [
      { en: 'Dalet', he: 'ד׳' },
      { en: 'Hey', he: 'ה׳' },
      { en: 'Vav', he: 'ו׳' },
      { en: 'Ramot', he: 'רמות' },
      { en: 'Old City', he: 'העיר העתיקה' },
      { en: 'Neve Zeev', he: 'נווה זאב' },
    ],
  },
  {
    city: { en: 'Rishon LeZion', he: 'ראשון לציון' },
    neighborhoods: [
      { en: 'Ramat Eliyahu', he: 'רמת אליהו' },
      { en: 'Nahalat Yehuda', he: 'נחלת יהודה' },
      { en: 'Neve Horesh', he: 'נווה חורש' },
      { en: 'Old City', he: 'העיר הישנה' },
    ],
  },
  {
    city: { en: 'Petah Tikva', he: 'פתח תקווה' },
    neighborhoods: [
      { en: 'Kiryat Matalon', he: 'קריית מטלון' },
      { en: 'Neve Ganim', he: 'נווה גנים' },
      { en: 'Ganei Tikva', he: 'גני תקווה' },
    ],
  },
  {
    city: { en: 'Ashdod', he: 'אשדוד' },
    neighborhoods: [
      { en: 'Gimel', he: 'ג׳' },
      { en: 'Dalet', he: 'ד׳' },
      { en: 'Hey', he: 'ה׳' },
      { en: 'Yud Alef', he: 'יא׳' },
    ],
  },
  {
    city: { en: 'Netanya', he: 'נתניה' },
    neighborhoods: [
      { en: 'Ir Yamim', he: 'עיר ימים' },
      { en: 'Kiryat Hasharon', he: 'קריית השרון' },
      { en: 'Old City', he: 'עיר ותיקה' },
      { en: 'Ramat Poleg', he: 'רמת פולג' },
    ],
  },
  {
    city: { en: 'Holon', he: 'חולון' },
    neighborhoods: [
      { en: 'Kiryat Sharet', he: 'קריית שרת' },
      { en: 'Neve Holon', he: 'נווה חולון' },
      { en: 'Ramat Pinkas', he: 'רמת פינקס' },
    ],
  },
  {
    city: { en: 'Bnei Brak', he: 'בני ברק' },
    neighborhoods: [
      { en: 'Kahaneman', he: 'קהנמן' },
      { en: 'Rabbi Akiva', he: 'רבי עקיבא' },
    ],
  },
  {
    city: { en: 'Bat Yam', he: 'בת ים' },
    neighborhoods: [
      { en: 'Old City', he: 'עיר ותיקה' },
      { en: 'Nave Sharet', he: 'נווה שרת' },
    ],
  },
  {
    city: { en: 'Ramat Gan', he: 'רמת גן' },
    neighborhoods: [
      { en: 'Diamond Exchange', he: 'בורסה' },
      { en: 'Neve Efraim', he: 'נווה אפרים' },
      { en: 'Kiryat Krinsky', he: 'קריית קרינסקי' },
    ],
  },
  {
    city: { en: 'Rehovot', he: 'רחובות' },
    neighborhoods: [
      { en: 'Kiryat Moshe', he: 'קריית משה' },
      { en: 'Neve Hadar', he: 'נווה הדר' },
    ],
  },
  {
    city: { en: 'Herzliya', he: 'הרצליה' },
    neighborhoods: [
      { en: 'Herzliya Pituah', he: 'הרצליה פיתוח' },
      { en: 'Kiryat Sharet', he: 'קריית שרת' },
      { en: 'Neve Amidar', he: 'נווה עמידר' },
    ],
  },
  {
    city: { en: 'Kfar Saba', he: 'כפר סבא' },
    neighborhoods: [
      { en: 'Neve Yamin', he: 'נווה ימין' },
      { en: 'Ramat HaChayal', he: 'רמת החייל' },
    ],
  },
  {
    city: { en: 'Ra\'anana', he: 'רעננה' },
    neighborhoods: [
      { en: 'Center', he: 'מרכז' },
      { en: 'Kiryat Weizmann', he: 'קריית ויצמן' },
    ],
  },
  {
    city: { en: 'Modi\'in', he: 'מודיעין' },
    neighborhoods: [
      { en: 'Buchman', he: 'בוכמן' },
      { en: 'Moriah', he: 'מוריה' },
      { en: 'Ganei Modi\'in', he: 'גני מודיעין' },
    ],
  },
  {
    city: { en: 'Eilat', he: 'אילת' },
    neighborhoods: [
      { en: 'City Center', he: 'מרכז העיר' },
      { en: 'North Beach', he: 'חוף צפוני' },
    ],
  },
  {
    city: { en: 'Nahariya', he: 'נהריה' },
    neighborhoods: [
      { en: 'Old City', he: 'עיר ותיקה' },
      { en: 'Kiryat Yam', he: 'קריית ים' },
    ],
  },
  {
    city: { en: 'Acre', he: 'עכו' },
    neighborhoods: [
      { en: 'Old City', he: 'העיר העתיקה' },
      { en: 'New City', he: 'העיר החדשה' },
    ],
  },
];

export default ISRAEL_LOCATIONS;

