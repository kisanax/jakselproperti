import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// AREA JAKARTA SELATAN (10 Kecamatan + 65 Kelurahan Resmi)
// =============================================================================
const areasData = [
  {
    name: "Cilandak",
    slug: "cilandak",
    children: [
      { name: "Cilandak Barat", slug: "cilandak-barat" },
      { name: "Cipete Selatan", slug: "cipete-selatan" },
      { name: "Gandaria Selatan", slug: "gandaria-selatan" },
      { name: "Lebak Bulus", slug: "lebak-bulus" },
      { name: "Pondok Labu", slug: "pondok-labu" },
    ],
  },
  {
    name: "Jagakarsa",
    slug: "jagakarsa",
    children: [
      { name: "Ciganjur", slug: "ciganjur" },
      { name: "Jagakarsa", slug: "jagakarsa-kel" },
      { name: "Lenteng Agung", slug: "lenteng-agung" },
      { name: "Srengseng Sawah", slug: "srengseng-sawah" },
      { name: "Tanjung Barat", slug: "tanjung-barat" },
      { name: "Cipedak", slug: "cipedak" },
    ],
  },
  {
    name: "Kebayoran Baru",
    slug: "kebayoran-baru",
    children: [
      { name: "Cipete Utara", slug: "cipete-utara" },
      { name: "Gandaria Utara", slug: "gandaria-utara" },
      { name: "Gunung", slug: "gunung" },
      { name: "Kramat Pela", slug: "kramat-pela" },
      { name: "Melawai", slug: "melawai" },
      { name: "Petogogan", slug: "petogogan" },
      { name: "Pulo", slug: "pulo" },
      { name: "Rawa Barat", slug: "rawa-barat" },
      { name: "Selong", slug: "selong" },
      { name: "Senayan", slug: "senayan" },
    ],
  },
  {
    name: "Kebayoran Lama",
    slug: "kebayoran-lama",
    children: [
      { name: "Cipulir", slug: "cipulir" },
      { name: "Grogol Selatan", slug: "grogol-selatan" },
      { name: "Grogol Utara", slug: "grogol-utara" },
      { name: "Kebayoran Lama Selatan", slug: "kebayoran-lama-selatan" },
      { name: "Kebayoran Lama Utara", slug: "kebayoran-lama-utara" },
      { name: "Pondok Pinang", slug: "pondok-pinang" },
    ],
  },
  {
    name: "Mampang Prapatan",
    slug: "mampang-prapatan",
    children: [
      { name: "Bangka", slug: "bangka" },
      { name: "Kuningan Barat", slug: "kuningan-barat" },
      { name: "Mampang Prapatan", slug: "mampang-prapatan-kel" },
      { name: "Pela Mampang", slug: "pela-mampang" },
      { name: "Tegal Parang", slug: "tegal-parang" },
    ],
  },
  {
    name: "Pancoran",
    slug: "pancoran",
    children: [
      { name: "Cikoko", slug: "cikoko" },
      { name: "Duren Tiga", slug: "duren-tiga" },
      { name: "Kalibata", slug: "kalibata" },
      { name: "Pancoran", slug: "pancoran-kel" },
      { name: "Pengadegan", slug: "pengadegan" },
      { name: "Rawajati", slug: "rawajati" },
    ],
  },
  {
    name: "Pasar Minggu",
    slug: "pasar-minggu",
    children: [
      { name: "Cilandak Timur", slug: "cilandak-timur" },
      { name: "Jati Padang", slug: "jati-padang" },
      { name: "Kebagusan", slug: "kebagusan" },
      { name: "Pejaten Barat", slug: "pejaten-barat" },
      { name: "Pejaten Timur", slug: "pejaten-timur" },
      { name: "Pasar Minggu", slug: "pasar-minggu-kel" },
      { name: "Ragunan", slug: "ragunan" },
    ],
  },
  {
    name: "Pesanggrahan",
    slug: "pesanggrahan",
    children: [
      { name: "Bintaro", slug: "bintaro" },
      { name: "Pesanggrahan", slug: "pesanggrahan-kel" },
      { name: "Ulujami", slug: "ulujami" },
    ],
  },
  {
    name: "Setiabudi",
    slug: "setiabudi",
    children: [
      { name: "Guntur", slug: "guntur" },
      { name: "Karet", slug: "karet" },
      { name: "Karet Kuningan", slug: "karet-kuningan" },
      { name: "Karet Semanggi", slug: "karet-semanggi" },
      { name: "Kuningan Timur", slug: "kuningan-timur" },
      { name: "Menteng Atas", slug: "menteng-atas" },
      { name: "Pasar Manggis", slug: "pasar-manggis" },
      { name: "Setiabudi", slug: "setiabudi-kel" },
    ],
  },
  {
    name: "Tebet",
    slug: "tebet",
    children: [
      { name: "Bukit Duri", slug: "bukit-duri" },
      { name: "Kebon Baru", slug: "kebon-baru" },
      { name: "Manggarai", slug: "manggarai" },
      { name: "Manggarai Selatan", slug: "manggarai-selatan" },
      { name: "Menteng Dalam", slug: "menteng-dalam" },
      { name: "Tebet Barat", slug: "tebet-barat" },
      { name: "Tebet Timur", slug: "tebet-timur" },
    ],
  },
];

// =============================================================================
// KAWASAN POPULER / BRANDED (Blueprint v0.3 — Section 15.3)
// =============================================================================
const kawasanData = [
  {
    name: "Kemang",
    slug: "kemang",
    areaSlug: "mampang-prapatan",
    tagline: "Pusat gaya hidup & ekspat favorit Jakarta Selatan",
    bannerImage: "/images/kawasan/kemang.webp",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: "Pondok Indah",
    slug: "pondok-indah",
    areaSlug: "kebayoran-lama",
    tagline: "Hunian prestisius & elite paling ikonik",
    bannerImage: "/images/kawasan/pondok-indah.webp",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: "Senopati & SCBD",
    slug: "senopati",
    areaSlug: "kebayoran-baru",
    tagline: "Kawasan premium di jantung bisnis & kuliner Jakarta",
    bannerImage: "/images/kawasan/senopati.webp",
    isFeatured: true,
    sortOrder: 3,
  },
  {
    name: "Cilandak",
    slug: "cilandak-kawasan",
    areaSlug: "cilandak",
    tagline: "Hunian asri dengan akses tol TB Simatupang & sekolah internasional",
    bannerImage: "/images/kawasan/cilandak.webp",
    isFeatured: true,
    sortOrder: 4,
  },
  {
    name: "Cipete",
    slug: "cipete",
    areaSlug: "cilandak",
    tagline: "Kawasan kuliner hits dengan nuansa residensial tenang",
    bannerImage: "/images/kawasan/cipete.webp",
    isFeatured: false,
    sortOrder: 5,
  },
  {
    name: "Tebet",
    slug: "tebet-kawasan",
    areaSlug: "tebet",
    tagline: "Kawasan strategis dengan akses mudah ke pusat Jakarta",
    bannerImage: "/images/kawasan/tebet.webp",
    isFeatured: false,
    sortOrder: 6,
  },
];

// =============================================================================
// AMENITIES
// =============================================================================
const amenitiesData = [
  // Outdoor
  { name: "Taman", slug: "taman", icon: "trees", category: "Outdoor" },
  { name: "Kolam Renang", slug: "kolam-renang", icon: "waves", category: "Outdoor" },
  { name: "Gazebo", slug: "gazebo", icon: "tent", category: "Outdoor" },
  { name: "Rooftop", slug: "rooftop", icon: "sun", category: "Outdoor" },
  { name: "Halaman Belakang", slug: "halaman-belakang", icon: "fence", category: "Outdoor" },

  // Parkir
  { name: "Garasi", slug: "garasi", icon: "warehouse", category: "Parkir" },
  { name: "Carport", slug: "carport", icon: "car", category: "Parkir" },
  { name: "Parkir Luas", slug: "parkir-luas", icon: "parking-circle", category: "Parkir" },

  // Interior
  { name: "AC", slug: "ac", icon: "air-vent", category: "Interior" },
  { name: "Water Heater", slug: "water-heater", icon: "flame", category: "Interior" },
  { name: "Dapur Bersih", slug: "dapur-bersih", icon: "chef-hat", category: "Interior" },
  { name: "Dapur Kotor", slug: "dapur-kotor", icon: "cooking-pot", category: "Interior" },
  { name: "Ruang Keluarga", slug: "ruang-keluarga", icon: "sofa", category: "Interior" },
  { name: "Ruang Makan", slug: "ruang-makan", icon: "utensils", category: "Interior" },
  { name: "Ruang Kerja", slug: "ruang-kerja", icon: "monitor", category: "Interior" },
  { name: "Kamar Pembantu", slug: "kamar-pembantu", icon: "bed-single", category: "Interior" },
  { name: "Gudang", slug: "gudang", icon: "package", category: "Interior" },

  // Keamanan
  { name: "CCTV", slug: "cctv", icon: "camera", category: "Keamanan" },
  { name: "Security 24 Jam", slug: "security-24-jam", icon: "shield-check", category: "Keamanan" },
  { name: "Akses Kartu / Smart Lock", slug: "smart-lock", icon: "key-round", category: "Keamanan" },
  { name: "Cluster / Gated Community", slug: "cluster", icon: "gate", category: "Keamanan" },
  { name: "Pagar Tinggi", slug: "pagar-tinggi", icon: "brick-wall", category: "Keamanan" },

  // Fasilitas Umum
  { name: "Dekat Sekolah", slug: "dekat-sekolah", icon: "graduation-cap", category: "Sekitar" },
  { name: "Dekat Mall", slug: "dekat-mall", icon: "shopping-bag", category: "Sekitar" },
  { name: "Dekat Rumah Sakit", slug: "dekat-rumah-sakit", icon: "hospital", category: "Sekitar" },
  { name: "Dekat Stasiun MRT/KRL", slug: "dekat-stasiun", icon: "train-front", category: "Sekitar" },
  { name: "Dekat Tol", slug: "dekat-tol", icon: "route", category: "Sekitar" },
  { name: "Dekat Tempat Ibadah", slug: "dekat-tempat-ibadah", icon: "church", category: "Sekitar" },

  // Utilitas
  { name: "Listrik 2200W+", slug: "listrik-2200", icon: "zap", category: "Utilitas" },
  { name: "Listrik 3500W+", slug: "listrik-3500", icon: "zap", category: "Utilitas" },
  { name: "PAM / Air Bersih", slug: "pam", icon: "droplets", category: "Utilitas" },
  { name: "Sumur / Jetpump", slug: "sumur", icon: "droplet", category: "Utilitas" },
  { name: "Internet / Fiber Optic", slug: "internet", icon: "wifi", category: "Utilitas" },
  { name: "Panel Surya", slug: "panel-surya", icon: "sun-dim", category: "Utilitas" },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================
async function main() {
  console.log("🌱 Seeding database jakselproperti (Blueprint v0.3)...\n");

  // -------------------------------------------------------------------------
  // 1. Seed Areas (10 Kecamatan + Kelurahan)
  // -------------------------------------------------------------------------
  console.log("📍 Seeding areas (10 kecamatan & 65 kelurahan)...");

  for (const kecamatan of areasData) {
    const parent = await prisma.area.upsert({
      where: { slug: kecamatan.slug },
      update: {},
      create: {
        name: kecamatan.name,
        slug: kecamatan.slug,
        level: 1,
      },
    });

    for (const kelurahan of kecamatan.children) {
      await prisma.area.upsert({
        where: { slug: kelurahan.slug },
        update: {},
        create: {
          name: kelurahan.name,
          slug: kelurahan.slug,
          level: 2,
          parentId: parent.id,
        },
      });
    }
  }

  const totalAreas = await prisma.area.count();
  console.log(`   ✅ ${totalAreas} areas created (10 kecamatan + kelurahan)\n`);

  // -------------------------------------------------------------------------
  // 2. Seed Kawasan Populer (Blueprint v0.3 Section 15.3)
  // -------------------------------------------------------------------------
  console.log("🏙️ Seeding kawasan populer / branded...");

  for (const k of kawasanData) {
    const area = await prisma.area.findUnique({
      where: { slug: k.areaSlug },
    });

    if (area) {
      await prisma.kawasan.upsert({
        where: { slug: k.slug },
        update: {
          tagline: k.tagline,
          bannerImage: k.bannerImage,
          isFeatured: k.isFeatured,
          sortOrder: k.sortOrder,
        },
        create: {
          name: k.name,
          slug: k.slug,
          areaId: area.id,
          tagline: k.tagline,
          bannerImage: k.bannerImage,
          isFeatured: k.isFeatured,
          sortOrder: k.sortOrder,
        },
      });
    }
  }

  const totalKawasan = await prisma.kawasan.count();
  console.log(`   ✅ ${totalKawasan} kawasan populer created\n`);

  // -------------------------------------------------------------------------
  // 3. Seed Amenities
  // -------------------------------------------------------------------------
  console.log("🏠 Seeding amenities...");

  for (const amenity of amenitiesData) {
    await prisma.amenity.upsert({
      where: { slug: amenity.slug },
      update: {},
      create: {
        name: amenity.name,
        slug: amenity.slug,
        icon: amenity.icon,
        category: amenity.category,
      },
    });
  }

  const totalAmenities = await prisma.amenity.count();
  console.log(`   ✅ ${totalAmenities} amenities created\n`);

  // -------------------------------------------------------------------------
  // 4. Seed Default Admin User
  // -------------------------------------------------------------------------
  console.log("👤 Seeding default admin user...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@jakselproperti.com" },
    update: {},
    create: {
      email: "admin@jakselproperti.com",
      name: "Admin",
      password: "$2b$10$placeholder", // akan diganti saat auth diimplementasi
    },
  });

  console.log("   ✅ Default admin created (admin@jakselproperti.com)\n");

  // -------------------------------------------------------------------------
  // 5. Seed Sample Data (Property + Kawasan + Customer + Lead Kanban)
  // -------------------------------------------------------------------------
  console.log("🏡 Seeding sample properties & listings with kawasan...");

  const kemangKawasan = await prisma.kawasan.findUnique({ where: { slug: "kemang" } });
  const pondokIndahKawasan = await prisma.kawasan.findUnique({ where: { slug: "pondok-indah" } });

  const mampangArea = await prisma.area.findFirst({ where: { slug: "mampang-prapatan" } });
  const kebayoranLamaArea = await prisma.area.findFirst({ where: { slug: "kebayoran-lama" } });
  const kebayoranBaruArea = await prisma.area.findFirst({ where: { slug: "kebayoran-baru" } });

  if (mampangArea && kebayoranLamaArea && kebayoranBaruArea) {
    // Sample Property 1
    const prop1 = await prisma.property.upsert({
      where: { code: "JS-0001" },
      update: {},
      create: {
        code: "JS-0001",
        type: "HOUSE",
        areaId: mampangArea.id,
        kawasanId: kemangKawasan?.id || null,
        address: "Jl. Kemang Utara IX No.12, RT 003/RW 005",
        landArea: 320,
        buildingArea: 280,
        bedrooms: 4,
        bathrooms: 3,
        floors: 2,
        garages: 1,
        carports: 2,
        certificateType: "SHM",
        yearBuilt: 2018,
        facing: "Selatan",
        electricity: 3500,
        waterSource: "PAM",
      },
    });

    // Sample Listing for Property 1
    await prisma.listing.upsert({
      where: { id: "sample-listing-1" },
      update: {},
      create: {
        id: "sample-listing-1",
        propertyId: prop1.id,
        status: "ACTIVE",
        askingPrice: 8500000000,
        minimumPrice: 7800000000,
        priceOnRequest: false,
        title: "Rumah Luas 2 Lantai di Kemang, Jakarta Selatan",
        description:
          "Rumah dengan halaman luas di kawasan elite Kemang. Dekat dengan pusat kuliner, sekolah internasional, dan akses tol. Cocok untuk keluarga yang menginginkan hunian premium di lokasi strategis Jakarta Selatan.",
        showFullAddress: false,
        publishedAt: new Date(),
      },
    });

    // Sample Property 2
    const prop2 = await prisma.property.upsert({
      where: { code: "JS-0002" },
      update: {},
      create: {
        code: "JS-0002",
        type: "HOUSE",
        areaId: kebayoranLamaArea.id,
        kawasanId: pondokIndahKawasan?.id || null,
        address: "Jl. Pondok Indah Raya No.45, RT 001/RW 002",
        landArea: 500,
        buildingArea: 450,
        bedrooms: 5,
        bathrooms: 4,
        floors: 2,
        garages: 2,
        carports: 2,
        certificateType: "SHM",
        yearBuilt: 2015,
        facing: "Barat",
        electricity: 5500,
        waterSource: "PAM",
      },
    });

    await prisma.listing.upsert({
      where: { id: "sample-listing-2" },
      update: {},
      create: {
        id: "sample-listing-2",
        propertyId: prop2.id,
        status: "DRAFT",
        askingPrice: 15000000000,
        priceOnRequest: true,
        title: "Rumah Mewah di Pondok Indah — Harga Hubungi Kami",
        description:
          "Rumah mewah 2 lantai di kawasan premium Pondok Indah. Kolam renang privat, taman luas, dan keamanan 24 jam.",
        showFullAddress: false,
      },
    });

    // Sample Property 3 — Tanah
    await prisma.property.upsert({
      where: { code: "JS-0003" },
      update: {},
      create: {
        code: "JS-0003",
        type: "LAND",
        areaId: kebayoranBaruArea.id,
        address: "Jl. Senopati No.88, RT 007/RW 003",
        landArea: 800,
        certificateType: "SHM",
        facing: "Utara",
      },
    });

    // Sample Owner
    const sampleOwner = await prisma.owner.upsert({
      where: { id: "sample-owner-1" },
      update: {},
      create: {
        id: "sample-owner-1",
        name: "Budi Santoso",
        phone: "08121234567",
        email: "budi@example.com",
        notes: "Owner kooperatif, bisa dihubungi via WhatsApp",
      },
    });

    // Link owner to property
    await prisma.propertyOwner.upsert({
      where: {
        propertyId_ownerId: {
          propertyId: prop1.id,
          ownerId: sampleOwner.id,
        },
      },
      update: {},
      create: {
        propertyId: prop1.id,
        ownerId: sampleOwner.id,
        isPrimary: true,
      },
    });

    // Sample Intermediary with Trust Level
    await prisma.intermediary.upsert({
      where: { id: "sample-intermediary-1" },
      update: {},
      create: {
        id: "sample-intermediary-1",
        name: "Rina Broker",
        phone: "08129876543",
        company: "Rina Property Agent",
        trustLevel: "VERIFIED",
        notes: "Perantara aktif di area Kemang & Cipete",
      },
    });

    // Sample Customer (Unique by Phone — Section 15.4)
    const sampleCustomer = await prisma.customer.upsert({
      where: { phone: "08131112222" },
      update: {},
      create: {
        name: "Ahmad Buyer",
        phone: "08131112222",
        email: "ahmad@example.com",
        notes: "Minat rumah di Kemang atau Cilandak, budget 8–10 M",
      },
    });

    // Sample Lead (Connected to Customer & Listing with Kanban stage)
    const sampleLead = await prisma.lead.upsert({
      where: { id: "sample-lead-1" },
      update: {},
      create: {
        id: "sample-lead-1",
        customerId: sampleCustomer.id,
        listingId: "sample-listing-1",
        currentStage: "NEW",
        source: "WHATSAPP",
        message: "Saya tertarik dengan rumah di Kemang. Bisa jadwalkan viewing?",
      },
    });

    // Sample LeadActivity
    await prisma.leadActivity.create({
      data: {
        leadId: sampleLead.id,
        userId: admin.id,
        type: "STAGE_CHANGE",
        fromStage: null,
        toStage: "NEW",
        summary: "Inquiry masuk melalui WhatsApp",
      },
    });

    console.log("   ✅ 3 sample properties created");
    console.log("   ✅ 2 sample listings created");
    console.log("   ✅ 1 sample owner + 1 intermediary created");
    console.log("   ✅ 1 customer + 1 lead (Kanban) created\n");
  }

  console.log("🎉 Seeding complete!\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
