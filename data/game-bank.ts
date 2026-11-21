export interface TugQuestion {
  id: string;
  bab: string;
  question: string;
  options: string[];
  answerIndex: number;
}

export interface JeopardyTile {
  id: string;
  points: number;
  question: string;
  answer: string;
}

export interface JeopardyCategory {
  title: string;
  color: string;
  tiles: JeopardyTile[];
}

export const TUG_QUESTIONS: TugQuestion[] = [
  {
    id: "tug-1",
    bab: "BAB 1",
    question: "Arti istilah 'Fastabiqul Khairāt' dalam QS. Al-Māidah/5:48 adalah...",
    options: ["Berlomba-lomba dalam kebaikan", "Bekerja keras tanpa henti", "Menjaga harta benda", "Menuntut ilmu di negeri jauh"],
    answerIndex: 0,
  },
  {
    id: "tug-2",
    bab: "BAB 9",
    question: "Prinsip menjaga akal dalam Al-Kulliyāt Al-Khamsah disebut...",
    options: ["Hifzhud Dīn", "Hifzhun Nafs", "Hifzhul 'Aql", "Hifzhul Māl"],
    answerIndex: 2,
  },
  {
    id: "tug-3",
    bab: "BAB 4",
    question: "Akad kerja sama bagi hasil antara pemilik modal dan pengelola usaha di bank syariah disebut...",
    options: ["Wadiah", "Mudharabah", "Qardh", "Ijarah"],
    answerIndex: 1,
  },
  {
    id: "tug-4",
    bab: "BAB 6",
    question: "Ayat Al-Qur'an yang secara tegas melarang perbuatan mendekati zina adalah...",
    options: ["QS. Al-Isrā'/17:32", "QS. Al-Māidah/5:48", "QS. At-Taubah/9:105", "QS. Al-Hujurāt/49:10"],
    answerIndex: 0,
  },
  {
    id: "tug-5",
    bab: "BAB 8",
    question: "Sifat keberanian membela kebenaran yang terukur oleh akal sehat disebut...",
    options: ["Riyā'", "Ghaḍab", "Syajā'ah", "Hasad"],
    answerIndex: 2,
  },
  {
    id: "tug-6",
    bab: "BAB 10",
    question: "Wali Songo yang terkenal berdakwah melalui media wayang dan tembang Jawa adalah...",
    options: ["Sunan Kalijaga", "Sunan Gresik", "Sunan Ampel", "Sunan Gunung Jati"],
    answerIndex: 0,
  },
  {
    id: "tug-7",
    bab: "BAB 3",
    question: "Pamer kebaikan agar dipuji manusia disebut...",
    options: ["Tawakal", "Riyā'", "Qana'ah", "Ikhlas"],
    answerIndex: 1,
  },
  {
    id: "tug-8",
    bab: "BAB 9",
    question: "Larangan membunuh dan kewajiban menjaga keselamatan berkendara termasuk implementasi...",
    options: ["Hifzhun Nafs", "Hifzhul Māl", "Hifzhun Nasl", "Hifzhud Dīn"],
    answerIndex: 0,
  },
  {
    id: "tug-9",
    bab: "BAB 7",
    question: "Menyerahkan hasil akhir kepada Allah setelah berusaha maksimal disebut...",
    options: ["Khauf", "Raja'", "Tawakal", "Zuhud"],
    answerIndex: 2,
  },
  {
    id: "tug-10",
    bab: "BAB 4",
    question: "Kesepakatan seluruh ulama mujtahid pada suatu masa mengenai hukum syara' disebut...",
    options: ["Qiyas", "Ijma'", "Istihsan", "Maslahah"],
    answerIndex: 1,
  },
  {
    id: "tug-11",
    bab: "BAB 2",
    question: "Menurut hadis riwayat Muslim, cabang iman yang paling rendah adalah...",
    options: ["Mengucapkan tahlil", "Menyingkirkan duri/gangguan dari jalan", "Bersedekah diam-diam", "Menjaga silaturahmi"],
    answerIndex: 1,
  },
  {
    id: "tug-12",
    bab: "BAB 9",
    question: "Menjaga kesucian pernikahan dan kehormatan keluarga merupakan wujud dari...",
    options: ["Hifzhun Nasl", "Hifzhul Māl", "Hifzhul 'Aql", "Hifzhun Nafs"],
    answerIndex: 0,
  },
  {
    id: "tug-13",
    bab: "BAB 1",
    question: "QS. At-Taubah/9:105 menekankan nilai utama bagi seorang pelajar, yaitu...",
    options: ["Etos kerja dan kesungguhan beramal", "Menghindari hutang piutang", "Berpuasa setiap hari", "Menghafal sejarah kerajaan"],
    answerIndex: 0,
  },
  {
    id: "tug-14",
    bab: "BAB 2",
    question: "Tiga dimensi utama dalam Syu'abul Iman (cabang-cabang iman) adalah...",
    options: ["Hati, lisan, dan perbuatan", "Ilmu, harta, dan jabatan", "Sabar, syukur, dan pujian", "Doa, mimpi, dan harapan"],
    answerIndex: 0,
  },
  {
    id: "tug-15",
    bab: "BAB 3",
    question: "Perasaan tidak senang melihat orang lain mendapat nikmat dan berharap nikmat itu hilang disebut...",
    options: ["Qana'ah", "Hasad", "Tawadhu'", "Syajā'ah"],
    answerIndex: 1,
  },
  {
    id: "tug-16",
    bab: "BAB 4",
    question: "Akad jual beli di bank syariah dengan menyebutkan harga pokok dan margin keuntungan secara transparan disebut...",
    options: ["Murabahah", "Wadiah", "Riba", "Qardh"],
    answerIndex: 0,
  },
  {
    id: "tug-17",
    bab: "BAB 5",
    question: "Falsafah 'Moh Limo' (menolak lima perbuatan tercela) diajarkan oleh...",
    options: ["Sunan Ampel", "Sunan Muria", "Sunan Drajat", "Sunan Bonang"],
    answerIndex: 0,
  },
  {
    id: "tug-18",
    bab: "BAB 7",
    question: "Rasa takut akan azab Allah sehingga menjauhi maksiat disebut...",
    options: ["Raja'", "Khauf", "Mahabbah", "Ihsan"],
    answerIndex: 1,
  },
  {
    id: "tug-19",
    bab: "BAB 8",
    question: "Salah satu cara sunnah meredam amarah (ghaḍab) saat sedang berdiri adalah...",
    options: ["Berteriak keras", "Duduk atau berwudhu", "Berlari kencang", "Membalas ucapan kasar"],
    answerIndex: 1,
  },
  {
    id: "tug-20",
    bab: "BAB 9",
    question: "Urutan prioritas pertama dalam Al-Kulliyāt Al-Khamsah adalah...",
    options: ["Hifzhul Māl (Harta)", "Hifzhud Dīn (Agama)", "Hifzhul 'Aql (Akal)", "Hifzhun Nasl (Keturunan)"],
    answerIndex: 1,
  },
];

export const JEOPARDY_BOARD: JeopardyCategory[] = [
  {
    title: "Al-Qur'an & Hadis",
    color: "from-emerald-700 to-emerald-900",
    tiles: [
      {
        id: "j-q1",
        points: 100,
        question: "Apa arti dari potongan ayat 'Fastabiqul Khairāt'?",
        answer: "Berlomba-lomba dalam kebaikan (QS. Al-Māidah/5:48).",
      },
      {
        id: "j-q2",
        points: 200,
        question: "Surat dan ayat berapakah yang membahas perintah etos kerja bahwa Allah, Rasul, dan orang mukmin melihat pekerjaan kita?",
        answer: "QS. At-Taubah/9 ayat 105.",
      },
      {
        id: "j-q3",
        points: 300,
        question: "Mengapa QS. Al-Isrā'/17:32 menggunakan kata 'jangan mendekati zina' bukan sekadar 'jangan berzina'?",
        answer: "Untuk menutup semua celah dan perantara (saddudz dzarī'ah) yang bisa menjerumuskan seseorang pada perbuatan zina.",
      },
      {
        id: "j-q4",
        points: 400,
        question: "Sebutkan 2 contoh perilaku etos kerja pelajar yang mencerminkan QS. At-Taubah/9:105!",
        answer: "Mengerjakan tugas dengan jujur tanpa mencontek, disiplin waktu, dan sungguh-sungguh mengembangkan potensi diri.",
      },
    ],
  },
  {
    title: "Fikih & Maqāṣid",
    color: "from-amber-600 to-amber-800",
    tiles: [
      {
        id: "j-f1",
        points: 100,
        question: "Apa arti dari Hifzhul 'Aql dalam Al-Kulliyāt Al-Khamsah?",
        answer: "Menjaga dan melindungi akal sehat (misalnya dengan menuntut ilmu dan menjauhi narkoba/khamr).",
      },
      {
        id: "j-f2",
        points: 200,
        question: "Sebutkan 4 sumber hukum Islam yang disepakati mayoritas ulama!",
        answer: "Al-Qur'an, Hadis (As-Sunnah), Ijma', dan Qiyas.",
      },
      {
        id: "j-f3",
        points: 300,
        question: "Apa nama akad jual beli di bank syariah di mana bank menyebutkan harga pokok dan margin keuntungan secara transparan?",
        answer: "Akad Murabahah.",
      },
      {
        id: "j-f4",
        points: 400,
        question: "Jika terjadi benturan antara menyelamatkan nyawa (Hifzhun Nafs) dan menyelamatkan harta (Hifzhul Māl), mana yang didahulukan dan mengapa?",
        answer: "Hifzhun Nafs (nyawa) didahulukan karena dalam urutan prioritas Al-Kulliyāt Al-Khamsah, jiwa berada di atas harta.",
      },
    ],
  },
  {
    title: "Akidah & Akhlak",
    color: "from-teal-700 to-teal-900",
    tiles: [
      {
        id: "j-a1",
        points: 100,
        question: "Apa lawan kata dari sifat ikhlas yang dapat merusak pahala amal?",
        answer: "Riyā' (pamer amal agar dipuji orang lain) atau sum'ah.",
      },
      {
        id: "j-a2",
        points: 200,
        question: "Jelaskan arti sifat Syajā'ah!",
        answer: "Keberanian yang mantap dan terkendali akal sehat untuk membela kebenaran dan mengakui kesalahan.",
      },
      {
        id: "j-a3",
        points: 300,
        question: "Mengapa seorang mukmin harus menyeimbangkan antara Khauf (takut) dan Raja' (harap)?",
        answer: "Agar tidak putus asa dari rahmat Allah (jika terlalu takut) dan tidak lalai/meremehkan dosa (jika terlalu berharap tanpa amal).",
      },
      {
        id: "j-a4",
        points: 400,
        question: "Sebutkan 3 cara menghindari sifat hasad (iri dengki) saat melihat teman berprestasi di media sosial!",
        answer: "Mengucapkan masyaAllah/mendoakan kebaikan, bersyukur atas nikmat diri sendiri (qana'ah), dan menjadikannya motivasi sehat.",
      },
    ],
  },
  {
    title: "Sejarah Islam",
    color: "from-sky-700 to-sky-900",
    tiles: [
      {
        id: "j-s1",
        points: 100,
        question: "Siapa nama asli Sunan Gresik yang dikenal sebagai perintis dakwah Wali Songo di Jawa?",
        answer: "Maulana Malik Ibrahim.",
      },
      {
        id: "j-s2",
        points: 200,
        question: "Ajaran falsafah 'Moh Limo' (menolak 5 perbuatan tercela) sangat lekat dengan dakwah siapa?",
        answer: "Sunan Ampel (Raden Rahmat).",
      },
      {
        id: "j-s3",
        points: 300,
        question: "Apa hikmah utama dari metode dakwah kultural yang diterapkan Sunan Kalijaga dan Sunan Kudus?",
        answer: "Dakwah disampaikan dengan toleransi, menghormati tradisi lokal yang tidak bertentangan dengan akidah, sehingga Islam diterima damai.",
      },
      {
        id: "j-s4",
        points: 400,
        question: "Mengapa Sunan Kudus menganjurkan masyarakat Kudus tidak menyembelih sapi saat Idul Adha pada masa dakwahnya?",
        answer: "Sebagai bentuk toleransi dan penghormatan terhadap masyarakat Hindu setempat yang memuliakan sapi, agar terjalin kerukunan.",
      },
    ],
  },
];
