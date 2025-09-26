// 🏖️ Tourism Controller
// Dinamičen uvoz modela glede na DEMO_MODE
const User = process.env.DEMO_MODE === 'true' 
  ? require('../models/DemoUser') 
  : require('../models/User');

// Demo podatki za turizem
const destinations = [
  {
    id: 1,
    name: 'Bled',
    description: 'Čudovito alpsko jezero z otokom in gradom',
    price: 150,
    duration: '2 dni',
    category: 'narava',
    image: '/images/bled.jpg',
    available: true,
    rating: 4.8,
    location: { lat: 46.3683, lng: 14.1147 },
    highlights: ['Blejski grad', 'Otok na jezeru', 'Kremšnita', 'Vintgar soteska']
  },
  {
    id: 2,
    name: 'Ljubljana',
    description: 'Prestolnica Slovenije z bogato kulturno dediščino',
    price: 120,
    duration: '1 dan',
    category: 'kultura',
    image: '/images/ljubljana.jpg',
    available: true,
    rating: 4.6,
    location: { lat: 46.0569, lng: 14.5058 },
    highlights: ['Ljubljanski grad', 'Tromostovje', 'Tivoli park', 'Stara Ljubljana']
  },
  {
    id: 3,
    name: 'Piran',
    description: 'Srednjeveško obmorsko mesto z beneškim šarmom',
    price: 180,
    duration: '2 dni',
    category: 'obala',
    image: '/images/piran.jpg',
    available: true,
    rating: 4.7,
    location: { lat: 45.5285, lng: 13.5683 },
    highlights: ['Tartinijev trg', 'Piranske solnice', 'Mestno obzidje', 'Morska panorama']
  },
  {
    id: 4,
    name: 'Bohinj',
    description: 'Triglavski narodni park in najlepše alpsko jezero',
    price: 200,
    duration: '3 dni',
    category: 'narava',
    image: '/images/bohinj.jpg',
    available: true,
    rating: 4.9,
    location: { lat: 46.2833, lng: 13.8500 },
    highlights: ['Bohinjsko jezero', 'Slap Savica', 'Vogel', 'Planinske poti']
  }
];

const bookings = [];

// 🏖️ Pridobi vse destinacije
const getDestinations = (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, sortBy = 'rating' } = req.query;
    
    let filteredDestinations = [...destinations];

    // Filtriraj po kategoriji
    if (category) {
      filteredDestinations = filteredDestinations.filter(dest => 
        dest.category === category
      );
    }

    // Filtriraj po ceni
    if (minPrice) {
      filteredDestinations = filteredDestinations.filter(dest => 
        dest.price >= parseInt(minPrice)
      );
    }
    if (maxPrice) {
      filteredDestinations = filteredDestinations.filter(dest => 
        dest.price <= parseInt(maxPrice)
      );
    }

    // Iskanje po imenu ali opisu
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDestinations = filteredDestinations.filter(dest => 
        dest.name.toLowerCase().includes(searchLower) ||
        dest.description.toLowerCase().includes(searchLower) ||
        dest.highlights.some(highlight => 
          highlight.toLowerCase().includes(searchLower)
        )
      );
    }

    // Sortiranje
    switch (sortBy) {
      case 'price_asc':
        filteredDestinations.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filteredDestinations.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filteredDestinations.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filteredDestinations.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        filteredDestinations.sort((a, b) => b.rating - a.rating);
    }

    res.json({
      success: true,
      destinations: filteredDestinations,
      total: filteredDestinations.length,
      filters: {
        categories: [...new Set(destinations.map(d => d.category))],
        priceRange: {
          min: Math.min(...destinations.map(d => d.price)),
          max: Math.max(...destinations.map(d => d.price))
        }
      }
    });

  } catch (error) {
    console.error('Get destinations napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju destinacij' 
    });
  }
};

// 🏖️ Pridobi posamezno destinacijo
const getDestinationById = (req, res) => {
  try {
    const { id } = req.params;
    const destination = destinations.find(dest => dest.id === parseInt(id));

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destinacija ni najdena'
      });
    }

    // Dodaj podobne destinacije
    const similarDestinations = destinations
      .filter(dest => 
        dest.id !== destination.id && 
        dest.category === destination.category
      )
      .slice(0, 3);

    res.json({
      success: true,
      destination: {
        ...destination,
        similarDestinations
      }
    });

  } catch (error) {
    console.error('Get destination detail napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju destinacije' 
    });
  }
};

// 📅 Ustvari rezervacijo
const createBooking = (req, res) => {
  try {
    const { destinationId, startDate, endDate, guests, specialRequests, contactInfo } = req.body;
    
    // Validacija
    if (!destinationId || !startDate || !endDate || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Vsi obvezni podatki morajo biti izpolnjeni'
      });
    }

    const destination = destinations.find(dest => dest.id === parseInt(destinationId));
    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destinacija ni najdena'
      });
    }

    if (!destination.available) {
      return res.status(400).json({
        success: false,
        message: 'Destinacija trenutno ni na voljo'
      });
    }

    // Preveri datume
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({
        success: false,
        message: 'Datum začetka ne more biti v preteklosti'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'Datum konca mora biti po datumu začetka'
      });
    }

    // Izračunaj ceno
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const basePrice = destination.price * parseInt(guests);
    const totalPrice = basePrice * Math.max(1, days);

    const booking = {
      id: bookings.length + 1,
      userId: req.user.userId,
      destinationId: parseInt(destinationId),
      destination: {
        name: destination.name,
        image: destination.image,
        location: destination.location
      },
      startDate,
      endDate,
      guests: parseInt(guests),
      days,
      basePrice,
      totalPrice,
      specialRequests: specialRequests || '',
      contactInfo: contactInfo || {},
      status: 'confirmed',
      createdAt: new Date(),
      bookingReference: `TUR-${Date.now()}`,
      paymentStatus: 'pending'
    };

    bookings.push(booking);

    res.status(201).json({
      success: true,
      message: 'Rezervacija uspešno ustvarjena',
      booking
    });

  } catch (error) {
    console.error('Create booking napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri ustvarjanju rezervacije' 
    });
  }
};

// 📋 Pridobi uporabnikove rezervacije
const getUserBookings = (req, res) => {
  try {
    const { status, upcoming } = req.query;
    
    let userBookings = bookings.filter(booking => 
      booking.userId === req.user.userId
    );

    // Filtriraj po statusu
    if (status) {
      userBookings = userBookings.filter(booking => booking.status === status);
    }

    // Filtriraj prihajajoče rezervacije
    if (upcoming === 'true') {
      const now = new Date();
      userBookings = userBookings.filter(booking => 
        new Date(booking.startDate) > now
      );
    }

    // Sortiraj po datumu
    userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      bookings: userBookings,
      total: userBookings.length,
      summary: {
        total: userBookings.length,
        confirmed: userBookings.filter(b => b.status === 'confirmed').length,
        cancelled: userBookings.filter(b => b.status === 'cancelled').length,
        completed: userBookings.filter(b => b.status === 'completed').length
      }
    });

  } catch (error) {
    console.error('Get user bookings napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju rezervacij' 
    });
  }
};

// 🔄 Posodobi rezervacijo
const updateBooking = (req, res) => {
  try {
    const { id } = req.params;
    const { specialRequests, contactInfo } = req.body;

    const bookingIndex = bookings.findIndex(booking => 
      booking.id === parseInt(id) && booking.userId === req.user.userId
    );

    if (bookingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Rezervacija ni najdena'
      });
    }

    const booking = bookings[bookingIndex];

    // Preveri, če je možno posodobiti
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Rezervacije ni možno več posodobiti'
      });
    }

    // Posodobi podatke
    if (specialRequests !== undefined) {
      bookings[bookingIndex].specialRequests = specialRequests;
    }
    if (contactInfo !== undefined) {
      bookings[bookingIndex].contactInfo = { ...booking.contactInfo, ...contactInfo };
    }

    bookings[bookingIndex].updatedAt = new Date();

    res.json({
      success: true,
      message: 'Rezervacija uspešno posodobljena',
      booking: bookings[bookingIndex]
    });

  } catch (error) {
    console.error('Update booking napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri posodabljanju rezervacije' 
    });
  }
};

// 🗑️ Prekliči rezervacijo
const cancelBooking = (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const bookingIndex = bookings.findIndex(booking => 
      booking.id === parseInt(id) && booking.userId === req.user.userId
    );

    if (bookingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Rezervacija ni najdena'
      });
    }

    const booking = bookings[bookingIndex];
    
    // Preveri, če je možno preklicati
    const startDate = new Date(booking.startDate);
    const now = new Date();
    const timeDiff = startDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 24) {
      return res.status(400).json({
        success: false,
        message: 'Rezervacijo lahko prekličete najpozneje 24 ur pred začetkom'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Rezervacija je že preklicana'
      });
    }

    // Prekliči rezervacijo
    bookings[bookingIndex].status = 'cancelled';
    bookings[bookingIndex].cancelledAt = new Date();
    bookings[bookingIndex].cancelReason = reason || '';

    res.json({
      success: true,
      message: 'Rezervacija uspešno preklicana',
      refundInfo: {
        eligible: true,
        amount: booking.totalPrice * 0.9, // 10% provizija
        processingTime: '3-5 delovnih dni'
      }
    });

  } catch (error) {
    console.error('Cancel booking napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri preklic rezervacije' 
    });
  }
};

// 📊 Statistike turizma (admin)
const getTourismStats = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthBookings = bookings.filter(booking => 
      new Date(booking.createdAt) >= thisMonth
    );
    const lastMonthBookings = bookings.filter(booking => 
      new Date(booking.createdAt) >= lastMonth && 
      new Date(booking.createdAt) < thisMonth
    );

    const stats = {
      overview: {
        totalDestinations: destinations.length,
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
        averageRating: destinations.reduce((sum, dest) => sum + dest.rating, 0) / destinations.length
      },
      monthly: {
        thisMonth: {
          bookings: thisMonthBookings.length,
          revenue: thisMonthBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
        },
        lastMonth: {
          bookings: lastMonthBookings.length,
          revenue: lastMonthBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
        }
      },
      popularDestinations: destinations
        .map(dest => ({
          ...dest,
          bookingCount: bookings.filter(booking => booking.destinationId === dest.id).length
        }))
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, 5),
      categoryDistribution: destinations.reduce((acc, dest) => {
        acc[dest.category] = (acc[dest.category] || 0) + 1;
        return acc;
      }, {}),
      bookingsByStatus: bookings.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Tourism stats napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju statistik' 
    });
  }
};

module.exports = {
  getDestinations,
  getDestination: getDestinationById,
  createBooking,
  getBookings: getUserBookings,
  updateBooking,
  cancelBooking,
  getTourismStats
};