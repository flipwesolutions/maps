import type { SearchPlace } from "./place-types";

function p(
  id: string,
  name: string,
  subtitle: string,
  lng: number,
  lat: number,
  type = "city"
): SearchPlace {
  return { id: `seed-${id}`, name, subtitle, coordinates: [lng, lat], type };
}

/** Curated places across all Indian states & UTs — offline instant search. */
export const INDIA_PLACES_SEED: SearchPlace[] = [
  // —— National landmarks ——
  p("taj", "Taj Mahal", "Agra, Uttar Pradesh", 78.0421, 27.1751, "landmark"),
  p("gateway", "Gateway of India", "Mumbai, Maharashtra", 72.8347, 18.922, "landmark"),
  p("india-gate", "India Gate", "New Delhi", 77.2295, 28.6129, "landmark"),
  p("red-fort", "Red Fort", "Delhi", 77.241, 28.6562, "landmark"),
  p("qutub", "Qutub Minar", "Delhi", 77.1855, 28.5244, "landmark"),
  p("charminar", "Charminar", "Hyderabad, Telangana", 78.4747, 17.3616, "landmark"),
  p("golden-temple", "Golden Temple", "Amritsar, Punjab", 74.8765, 31.62, "landmark"),
  p("hampi", "Hampi", "Vijayanagara, Karnataka", 76.46, 15.335, "landmark"),
  p("jaipur-palace", "Hawa Mahal", "Jaipur, Rajasthan", 75.8267, 26.9239, "landmark"),
  p("victoria", "Victoria Memorial", "Kolkata, West Bengal", 88.3426, 22.5448, "landmark"),
  p("meenakshi", "Meenakshi Temple", "Madurai, Tamil Nadu", 78.1198, 9.9195, "landmark"),
  p("kerala-backwaters", "Alleppey Backwaters", "Alappuzha, Kerala", 76.3388, 9.4981, "landmark"),

  // —— Andhra Pradesh ——
  p("ap-vijayawada", "Vijayawada", "Andhra Pradesh", 80.648, 16.5062),
  p("ap-visakhapatnam", "Visakhapatnam", "Andhra Pradesh", 83.2185, 17.6868),
  p("ap-tirupati", "Tirupati", "Andhra Pradesh", 79.4192, 13.6288),
  p("ap-amaravati", "Amaravati", "Andhra Pradesh", 80.515, 16.5135),
  p("ap-guntur", "Guntur", "Andhra Pradesh", 80.44, 16.3067),
  p("ap-nellore", "Nellore", "Andhra Pradesh", 79.9865, 14.4426),
  p("ap-kurnool", "Kurnool", "Andhra Pradesh", 78.037, 15.8281),
  p("ap-kakinada", "Kakinada", "Andhra Pradesh", 82.2475, 16.9891),
  p("ap-anantapur", "Anantapur", "Andhra Pradesh", 77.6, 14.6819),
  p("ap-rajahmundry", "Rajahmundry", "Andhra Pradesh", 81.804, 17.0005),

  // —— Arunachal Pradesh ——
  p("ar-itanagar", "Itanagar", "Arunachal Pradesh", 93.6053, 27.0844),
  p("ar-tawang", "Tawang", "Arunachal Pradesh", 91.8654, 27.5861),
  p("ar-pasighat", "Pasighat", "Arunachal Pradesh", 95.3268, 28.0662),
  p("ar-ziro", "Ziro", "Arunachal Pradesh", 93.8281, 27.543),

  // —— Assam ——
  p("as-guwahati", "Guwahati", "Assam", 91.7362, 26.1445),
  p("as-dibrugarh", "Dibrugarh", "Assam", 94.912, 27.4728),
  p("as-silchar", "Silchar", "Assam", 92.7789, 24.8333),
  p("as-jorhat", "Jorhat", "Assam", 94.2037, 26.7509),
  p("as-tezpur", "Tezpur", "Assam", 92.7926, 26.6528),
  p("as-kaziranga", "Kaziranga National Park", "Assam", 93.1714, 26.5775, "landmark"),

  // —— Bihar ——
  p("br-patna", "Patna", "Bihar", 85.1376, 25.5941),
  p("br-gaya", "Gaya", "Bihar", 85.0002, 24.7955),
  p("br-muzaffarpur", "Muzaffarpur", "Bihar", 85.3647, 26.1209),
  p("br-bhagalpur", "Bhagalpur", "Bihar", 86.9824, 25.2425),
  p("br-darbhanga", "Darbhanga", "Bihar", 85.894, 26.1542),
  p("br-bodh-gaya", "Bodh Gaya", "Bihar", 84.9914, 24.6961, "landmark"),

  // —— Chhattisgarh ——
  p("cg-raipur", "Raipur", "Chhattisgarh", 81.6296, 21.2514),
  p("cg-bhilai", "Bhilai", "Chhattisgarh", 81.3509, 21.2094),
  p("cg-bilaspur", "Bilaspur", "Chhattisgarh", 82.1391, 22.0797),
  p("cg-durg", "Durg", "Chhattisgarh", 81.2849, 21.1904),

  // —— Goa ——
  p("ga-panaji", "Panaji", "Goa", 73.8278, 15.4909),
  p("ga-margao", "Margao", "Goa", 73.957, 15.2832),
  p("ga-vasco", "Vasco da Gama", "Goa", 73.8157, 15.3989),
  p("ga-calangute", "Calangute Beach", "Goa", 73.7617, 15.5439, "landmark"),

  // —— Gujarat ——
  p("gj-ahmedabad", "Ahmedabad", "Gujarat", 72.5714, 23.0225),
  p("gj-surat", "Surat", "Gujarat", 72.8311, 21.1702),
  p("gj-vadodara", "Vadodara", "Gujarat", 73.1812, 22.3072),
  p("gj-rajkot", "Rajkot", "Gujarat", 70.8022, 22.3039),
  p("gj-gandhinagar", "Gandhinagar", "Gujarat", 72.6369, 23.2156),
  p("gj-bhavnagar", "Bhavnagar", "Gujarat", 72.1519, 21.7645),
  p("gj-jamnagar", "Jamnagar", "Gujarat", 70.0577, 22.4707),
  p("gj-statue", "Statue of Unity", "Gujarat", 73.7191, 21.838, "landmark"),
  p("gj-dwarka", "Dwarka", "Gujarat", 68.9678, 22.2394, "landmark"),

  // —— Haryana ——
  p("hr-gurugram", "Gurugram", "Haryana", 77.0266, 28.4595),
  p("hr-faridabad", "Faridabad", "Haryana", 77.3178, 28.4089),
  p("hr-chandigarh", "Chandigarh", "Chandigarh", 76.7794, 30.7333),
  p("hr-panipat", "Panipat", "Haryana", 76.9635, 29.3909),
  p("hr-ambala", "Ambala", "Haryana", 76.7767, 30.3782),

  // —— Himachal Pradesh ——
  p("hp-shimla", "Shimla", "Himachal Pradesh", 77.1734, 31.1048),
  p("hp-manali", "Manali", "Himachal Pradesh", 77.1892, 32.2432),
  p("hp-dharamshala", "Dharamshala", "Himachal Pradesh", 76.3234, 32.219),
  p("hp-kullu", "Kullu", "Himachal Pradesh", 77.1087, 31.9579),

  // —— Jharkhand ——
  p("jh-ranchi", "Ranchi", "Jharkhand", 85.3096, 23.3441),
  p("jh-jamshedpur", "Jamshedpur", "Jharkhand", 86.2029, 22.8046),
  p("jh-dhanbad", "Dhanbad", "Jharkhand", 86.4304, 23.7957),
  p("jh-bokaro", "Bokaro", "Jharkhand", 86.1511, 23.6693),

  // —— Karnataka ——
  p("ka-bengaluru", "Bengaluru", "Karnataka", 77.5946, 12.9716),
  p("ka-mysuru", "Mysuru", "Karnataka", 76.6394, 12.2958),
  p("ka-mangaluru", "Mangaluru", "Karnataka", 74.856, 12.9141),
  p("ka-hubballi", "Hubballi", "Karnataka", 75.124, 15.3647),
  p("ka-belagavi", "Belagavi", "Karnataka", 74.4977, 15.8497),
  p("ka-udupi", "Udupi", "Karnataka", 74.7421, 13.3409),
  p("ka-hampi", "Hampi", "Karnataka", 76.46, 15.335, "landmark"),
  p("ka-coorg", "Coorg", "Karnataka", 75.7382, 12.4244),

  // —— Kerala ——
  p("kl-kochi", "Kochi", "Kerala", 76.2673, 9.9312),
  p("kl-thiruvananthapuram", "Thiruvananthapuram", "Kerala", 76.9366, 8.5241),
  p("kl-kozhikode", "Kozhikode", "Kerala", 75.7804, 11.2588),
  p("kl-thrissur", "Thrissur", "Kerala", 76.2144, 10.5276),
  p("kl-munnar", "Munnar", "Kerala", 77.0594, 10.0889),
  p("kl-alappuzha", "Alappuzha", "Kerala", 76.3388, 9.4981),
  p("kl-kannur", "Kannur", "Kerala", 75.3704, 11.8745),

  // —— Madhya Pradesh ——
  p("mp-bhopal", "Bhopal", "Madhya Pradesh", 77.4126, 23.2599),
  p("mp-indore", "Indore", "Madhya Pradesh", 75.8577, 22.7196),
  p("mp-jabalpur", "Jabalpur", "Madhya Pradesh", 79.9864, 23.1815),
  p("mp-gwalior", "Gwalior", "Madhya Pradesh", 78.1828, 26.2183),
  p("mp-ujjain", "Ujjain", "Madhya Pradesh", 75.7849, 23.1765),
  p("mp-khajuraho", "Khajuraho", "Madhya Pradesh", 79.9199, 24.8318, "landmark"),

  // —— Maharashtra ——
  p("mh-mumbai", "Mumbai", "Maharashtra", 72.8777, 19.076),
  p("mh-pune", "Pune", "Maharashtra", 73.8567, 18.5204),
  p("mh-nagpur", "Nagpur", "Maharashtra", 79.0882, 21.1458),
  p("mh-nashik", "Nashik", "Maharashtra", 73.7898, 19.9975),
  p("mh-aurangabad", "Aurangabad", "Maharashtra", 75.3433, 19.8762),
  p("mh-thane", "Thane", "Maharashtra", 72.9781, 19.2183),
  p("mh-kolhapur", "Kolhapur", "Maharashtra", 74.2433, 16.705),
  p("mh-ajanta", "Ajanta Caves", "Maharashtra", 75.7003, 20.5519, "landmark"),
  p("mh-lonavala", "Lonavala", "Maharashtra", 73.4072, 18.7486),

  // —— Manipur ——
  p("mn-imphal", "Imphal", "Manipur", 93.9368, 24.817),
  p("mn-loktak", "Loktak Lake", "Manipur", 93.781, 24.5571, "landmark"),

  // —— Meghalaya ——
  p("ml-shillong", "Shillong", "Meghalaya", 91.8933, 25.5788),
  p("ml-cherrapunji", "Cherrapunji", "Meghalaya", 91.7036, 25.2996),

  // —— Mizoram ——
  p("mz-aizawl", "Aizawl", "Mizoram", 92.7176, 23.7271),

  // —— Nagaland ——
  p("nl-kohima", "Kohima", "Nagaland", 94.1086, 25.6751),
  p("nl-dimapur", "Dimapur", "Nagaland", 93.7537, 25.9043),

  // —— Odisha ——
  p("od-bhubaneswar", "Bhubaneswar", "Odisha", 85.8245, 20.2961),
  p("od-cuttack", "Cuttack", "Odisha", 85.8828, 20.4625),
  p("od-puri", "Puri", "Odisha", 85.8312, 19.8135),
  p("od-rourkela", "Rourkela", "Odisha", 84.8539, 22.2604),
  p("od-konark", "Konark Sun Temple", "Odisha", 86.0945, 19.8876, "landmark"),

  // —— Punjab ——
  p("pb-ludhiana", "Ludhiana", "Punjab", 75.8573, 30.901),
  p("pb-amritsar", "Amritsar", "Punjab", 74.8765, 31.634),
  p("pb-jalandhar", "Jalandhar", "Punjab", 75.5762, 31.326),
  p("pb-patiala", "Patiala", "Punjab", 76.3869, 30.3398),
  p("pb-chandigarh", "Chandigarh", "Punjab", 76.7794, 30.7333),

  // —— Rajasthan ——
  p("rj-jaipur", "Jaipur", "Rajasthan", 75.7873, 26.9124),
  p("rj-jodhpur", "Jodhpur", "Rajasthan", 73.0243, 26.2389),
  p("rj-udaipur", "Udaipur", "Rajasthan", 73.7125, 24.5854),
  p("rj-kota", "Kota", "Rajasthan", 75.8648, 25.2138),
  p("rj-ajmer", "Ajmer", "Rajasthan", 74.6399, 26.4499),
  p("rj-bikaner", "Bikaner", "Rajasthan", 73.3119, 28.0229),
  p("rj-jaisalmer", "Jaisalmer", "Rajasthan", 70.9127, 26.9157),
  p("rj-mount-abu", "Mount Abu", "Rajasthan", 72.7181, 24.5926),

  // —— Sikkim ——
  p("sk-gangtok", "Gangtok", "Sikkim", 88.6138, 27.3389),
  p("sk-nathula", "Nathula Pass", "Sikkim", 88.8228, 27.3864, "landmark"),

  // —— Tamil Nadu ——
  p("tn-chennai", "Chennai", "Tamil Nadu", 80.2707, 13.0827),
  p("tn-coimbatore", "Coimbatore", "Tamil Nadu", 76.9558, 11.0168),
  p("tn-madurai", "Madurai", "Tamil Nadu", 78.1198, 9.9252),
  p("tn-tiruchirappalli", "Tiruchirappalli", "Tamil Nadu", 78.7047, 10.7905),
  p("tn-salem", "Salem", "Tamil Nadu", 78.146, 11.6643),
  p("tn-ooty", "Ooty", "Tamil Nadu", 76.6932, 11.4064),
  p("tn-kanyakumari", "Kanyakumari", "Tamil Nadu", 77.5385, 8.0883, "landmark"),
  p("tn-rameswaram", "Rameswaram", "Tamil Nadu", 79.3129, 9.2876),

  // —— Telangana ——
  p("tg-hyderabad", "Hyderabad", "Telangana", 78.4867, 17.385),
  p("tg-warangal", "Warangal", "Telangana", 79.5882, 17.9689),
  p("tg-nizamabad", "Nizamabad", "Telangana", 78.0932, 18.6725),
  p("tg-karimnagar", "Karimnagar", "Telangana", 79.1288, 18.4386),
  p("tg-khammam", "Khammam", "Telangana", 80.1514, 17.2473),
  p("tg-secunderabad", "Secunderabad", "Telangana", 78.4983, 17.4399),
  p("tg-gachibowli", "Gachibowli", "Hyderabad, Telangana", 78.3489, 17.4401),
  p("tg-hitec", "HITEC City", "Hyderabad, Telangana", 78.3772, 17.4435),
  p("tg-charminar", "Charminar", "Hyderabad, Telangana", 78.4747, 17.3616, "landmark"),

  // —— Tripura ——
  p("tr-agartala", "Agartala", "Tripura", 91.2868, 23.8315),

  // —— Uttar Pradesh ——
  p("up-lucknow", "Lucknow", "Uttar Pradesh", 80.9462, 26.8467),
  p("up-kanpur", "Kanpur", "Uttar Pradesh", 80.3319, 26.4499),
  p("up-varanasi", "Varanasi", "Uttar Pradesh", 82.9739, 25.3176),
  p("up-agra", "Agra", "Uttar Pradesh", 78.0081, 27.1767),
  p("up-noida", "Noida", "Uttar Pradesh", 77.391, 28.5355),
  p("up-greater-noida", "Greater Noida", "Uttar Pradesh", 77.536, 28.4744),
  p("up-meerut", "Meerut", "Uttar Pradesh", 77.7064, 28.9845),
  p("up-allahabad", "Prayagraj", "Uttar Pradesh", 81.8463, 25.4358),
  p("up-ayodhya", "Ayodhya", "Uttar Pradesh", 82.1998, 26.7922),

  // —— Uttarakhand ——
  p("uk-dehradun", "Dehradun", "Uttarakhand", 78.0322, 30.3165),
  p("uk-haridwar", "Haridwar", "Uttarakhand", 78.1642, 29.9457),
  p("uk-rishikesh", "Rishikesh", "Uttarakhand", 78.2676, 30.0869),
  p("uk-nainital", "Nainital", "Uttarakhand", 79.4636, 29.3919),

  // —— West Bengal ——
  p("wb-kolkata", "Kolkata", "West Bengal", 88.3639, 22.5726),
  p("wb-howrah", "Howrah", "West Bengal", 88.2636, 22.5958),
  p("wb-darjeeling", "Darjeeling", "West Bengal", 88.2627, 27.036),
  p("wb-siliguri", "Siliguri", "West Bengal", 88.3953, 26.7271),
  p("wb-durgapur", "Durgapur", "West Bengal", 87.3119, 23.5204),

  // —— Union Territories ——
  p("ut-delhi", "New Delhi", "Delhi", 77.209, 28.6139),
  p("ut-chennai", "Chennai", "Tamil Nadu", 80.2707, 13.0827),
  p("ut-port-blair", "Port Blair", "Andaman & Nicobar", 92.7265, 11.6234),
  p("ut-leh", "Leh", "Ladakh", 77.577, 34.1526),
  p("ut-kargil", "Kargil", "Ladakh", 76.2711, 34.5539),
  p("ut-srinagar", "Srinagar", "Jammu & Kashmir", 74.7973, 34.0837),
  p("ut-jammu", "Jammu", "Jammu & Kashmir", 74.857, 32.7266),
  p("ut-puducherry", "Puducherry", "Puducherry", 79.8083, 11.9416),
  p("ut-kavaratti", "Kavaratti", "Lakshadweep", 72.6358, 10.5593),
  p("ut-daman", "Daman", "Dadra & Nagar Haveli and Daman & Diu", 72.8328, 20.4283),
  p("ut-silvassa", "Silvassa", "Dadra & Nagar Haveli", 73.0169, 20.2762),

  // —— Major airports (travel hubs) ——
  p("ap-del", "Indira Gandhi Airport", "Delhi", 77.0997, 28.5562, "airport"),
  p("ap-bom", "Chhatrapati Shivaji Airport", "Mumbai", 72.8656, 19.0896, "airport"),
  p("ap-blr", "Kempegowda Airport", "Bengaluru", 77.6682, 13.1986, "airport"),
  p("ap-hyd", "Rajiv Gandhi Airport", "Hyderabad", 78.4294, 17.2403, "airport"),
  p("ap-maa", "Chennai Airport", "Chennai", 80.1693, 12.9941, "airport"),
  p("ap-ccu", "Kolkata Airport", "Kolkata", 88.4467, 22.6547, "airport"),
  p("ap-amd", "Sardar Vallabhbhai Patel Airport", "Ahmedabad", 72.6347, 23.0772, "airport"),
  p("ap-goi", "Goa Airport", "Goa", 73.8318, 15.3808, "airport"),
];
