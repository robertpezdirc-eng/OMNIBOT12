// 🍽️ Horeca Controller (Gostinstvo)
// Demo podatki za gostinstvo
const menuItems = [
  {
    id: 1,
    name: 'Kranjska klobasa',
    description: 'Tradicionalna slovenska klobasa s kislim zeljem',
    price: 12.50,
    category: 'glavne_jedi',
    image: '/images/kranjska.jpg',
    available: true,
    allergens: ['gluten'],
    preparationTime: 15,
    ingredients: ['kranjska klobasa', 'kislo zelje', 'gorčica', 'kruh'],
    nutritionalInfo: {
      calories: 450,
      protein: 18,
      carbs: 25,
      fat: 32
    }
  },
  {
    id: 2,
    name: 'Štruklji',
    description: 'Domači štruklji z skuto in smetano',
    price: 8.90,
    category: 'sladice',
    image: '/images/struklji.jpg',
    available: true,
    allergens: ['gluten', 'mleko'],
    preparationTime: 20,
    ingredients: ['testo', 'skuta', 'smetana', 'jajca', 'maslo'],
    nutritionalInfo: {
      calories: 320,
      protein: 12,
      carbs: 35,
      fat: 15
    }
  },
  {
    id: 3,
    name: 'Jota',
    description: 'Tradicionalna slovenska enolončnica',
    price: 7.50,
    category: 'juhe',
    image: '/images/jota.jpg',
    available: true,
    allergens: [],
    preparationTime: 10,
    ingredients: ['fižol', 'kislo zelje', 'krompir', 'klobasa', 'začimbe'],
    nutritionalInfo: {
      calories: 280,
      protein: 15,
      carbs: 30,
      fat: 12
    }
  },
  {
    id: 4,
    name: 'Postrv na žaru',
    description: 'Sveža postrv z zelišči in limono',
    price: 18.00,
    category: 'glavne_jedi',
    image: '/images/postrv.jpg',
    available: true,
    allergens: ['ribe'],
    preparationTime: 25,
    ingredients: ['postrv', 'limona', 'zelišča', 'oljčno olje', 'sol'],
    nutritionalInfo: {
      calories: 380,
      protein: 35,
      carbs: 5,
      fat: 22
    }
  },
  {
    id: 5,
    name: 'Prekmurska gibanica',
    description: 'Tradicionalna slovenska sladica',
    price: 6.50,
    category: 'sladice',
    image: '/images/gibanica.jpg',
    available: true,
    allergens: ['gluten', 'mleko', 'jajca'],
    preparationTime: 5,
    ingredients: ['testo', 'skuta', 'jabolka', 'orehi', 'mak', 'rozine'],
    nutritionalInfo: {
      calories: 420,
      protein: 8,
      carbs: 55,
      fat: 18
    }
  }
];

const orders = [];
const tables = [
  { id: 1, number: 1, seats: 4, status: 'available', location: 'terasa' },
  { id: 2, number: 2, seats: 2, status: 'occupied', location: 'notranjost' },
  { id: 3, number: 3, seats: 6, status: 'available', location: 'vrt' },
  { id: 4, number: 4, seats: 4, status: 'reserved', location: 'notranjost' },
  { id: 5, number: 5, seats: 8, status: 'available', location: 'terasa' }
];

// 🍽️ Pridobi celoten meni
const getMenu = (req, res) => {
  try {
    const { category, available, maxPrice, allergens, sortBy = 'category' } = req.query;
    
    let filteredMenu = [...menuItems];

    // Filtriraj po kategoriji
    if (category) {
      filteredMenu = filteredMenu.filter(item => 
        item.category === category
      );
    }

    // Filtriraj po dostopnosti
    if (available === 'true') {
      filteredMenu = filteredMenu.filter(item => item.available);
    }

    // Filtriraj po ceni
    if (maxPrice) {
      filteredMenu = filteredMenu.filter(item => 
        item.price <= parseFloat(maxPrice)
      );
    }

    // Filtriraj po alergenih
    if (allergens) {
      const allergenList = allergens.split(',');
      filteredMenu = filteredMenu.filter(item => 
        !allergenList.some(allergen => item.allergens.includes(allergen))
      );
    }

    // Sortiranje
    switch (sortBy) {
      case 'price_asc':
        filteredMenu.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filteredMenu.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filteredMenu.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'preparation_time':
        filteredMenu.sort((a, b) => a.preparationTime - b.preparationTime);
        break;
      default:
        // Razvrsti po kategorijah
        const categoryOrder = ['juhe', 'glavne_jedi', 'sladice', 'pijace'];
        filteredMenu.sort((a, b) => {
          const aIndex = categoryOrder.indexOf(a.category);
          const bIndex = categoryOrder.indexOf(b.category);
          return aIndex - bIndex;
        });
    }

    // Razvrsti po kategorijah za prikaz
    const categorizedMenu = {
      juhe: filteredMenu.filter(item => item.category === 'juhe'),
      glavne_jedi: filteredMenu.filter(item => item.category === 'glavne_jedi'),
      sladice: filteredMenu.filter(item => item.category === 'sladice'),
      pijace: filteredMenu.filter(item => item.category === 'pijace')
    };

    res.json({
      success: true,
      menu: categorizedMenu,
      total: filteredMenu.length,
      filters: {
        categories: [...new Set(menuItems.map(item => item.category))],
        allergens: [...new Set(menuItems.flatMap(item => item.allergens))],
        priceRange: {
          min: Math.min(...menuItems.map(item => item.price)),
          max: Math.max(...menuItems.map(item => item.price))
        }
      }
    });

  } catch (error) {
    console.error('Get menu napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju menija' 
    });
  }
};

// 🍽️ Pridobi posamezno jed
const getMenuItem = (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = menuItems.find(item => item.id === parseInt(id));

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Jed ni najdena'
      });
    }

    // Dodaj podobne jedi
    const similarItems = menuItems
      .filter(item => 
        item.id !== menuItem.id && 
        item.category === menuItem.category &&
        item.available
      )
      .slice(0, 3);

    res.json({
      success: true,
      menuItem: {
        ...menuItem,
        similarItems
      }
    });

  } catch (error) {
    console.error('Get menu item napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju jedi' 
    });
  }
};

// 📋 Ustvari naročilo
const createOrder = (req, res) => {
  try {
    const { items, tableNumber, specialInstructions, customerInfo } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Naročilo mora vsebovati vsaj eno jed'
      });
    }

    // Preveri, če so vse jedi na voljo
    const orderItems = [];
    let totalPrice = 0;
    let totalPreparationTime = 0;

    for (const orderItem of items) {
      const menuItem = menuItems.find(item => 
        item.id === orderItem.menuItemId && item.available
      );
      
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Jed z ID ${orderItem.menuItemId} ni na voljo`
        });
      }

      const quantity = orderItem.quantity || 1;
      if (quantity <= 0 || quantity > 10) {
        return res.status(400).json({
          success: false,
          message: 'Količina mora biti med 1 in 10'
        });
      }

      orderItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        subtotal: menuItem.price * quantity,
        preparationTime: menuItem.preparationTime,
        allergens: menuItem.allergens
      });

      totalPrice += menuItem.price * quantity;
      totalPreparationTime = Math.max(totalPreparationTime, menuItem.preparationTime);
    }

    // Preveri mizo, če je podana
    if (tableNumber) {
      const table = tables.find(t => t.number === parseInt(tableNumber));
      if (!table) {
        return res.status(400).json({
          success: false,
          message: 'Miza ne obstaja'
        });
      }
      if (table.status === 'occupied') {
        return res.status(400).json({
          success: false,
          message: 'Miza je že zasedena'
        });
      }
    }

    const order = {
      id: orders.length + 1,
      userId: req.user.userId,
      items: orderItems,
      tableNumber: tableNumber || null,
      totalPrice,
      estimatedTime: totalPreparationTime,
      specialInstructions: specialInstructions || '',
      customerInfo: customerInfo || {},
      status: 'pending',
      createdAt: new Date(),
      orderNumber: `ORD-${Date.now()}`,
      paymentStatus: 'pending'
    };

    orders.push(order);

    // Posodobi status mize, če je podana
    if (tableNumber) {
      const tableIndex = tables.findIndex(t => t.number === parseInt(tableNumber));
      if (tableIndex !== -1) {
        tables[tableIndex].status = 'occupied';
        tables[tableIndex].orderId = order.id;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Naročilo uspešno ustvarjeno',
      order
    });

  } catch (error) {
    console.error('Create order napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri ustvarjanju naročila' 
    });
  }
};

// 📋 Pridobi uporabnikova naročila
const getUserOrders = (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    
    let userOrders = orders.filter(order => 
      order.userId === req.user.userId
    );

    // Filtriraj po statusu
    if (status) {
      userOrders = userOrders.filter(order => order.status === status);
    }

    // Omeji število rezultatov
    userOrders = userOrders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      orders: userOrders,
      total: userOrders.length,
      summary: {
        total: userOrders.length,
        pending: userOrders.filter(o => o.status === 'pending').length,
        preparing: userOrders.filter(o => o.status === 'preparing').length,
        ready: userOrders.filter(o => o.status === 'ready').length,
        served: userOrders.filter(o => o.status === 'served').length
      }
    });

  } catch (error) {
    console.error('Get user orders napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju naročil' 
    });
  }
};

// 🔄 Posodobi status naročila (osebje/admin)
const updateOrderStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user.isAdmin && !req.user.isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so osebje pravice'
      });
    }

    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Neveljaven status naročila'
      });
    }

    const orderIndex = orders.findIndex(order => order.id === parseInt(id));
    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Naročilo ni najdeno'
      });
    }

    const order = orders[orderIndex];
    const oldStatus = order.status;

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date();

    // Posodobi status mize
    if (status === 'served' && order.tableNumber) {
      const tableIndex = tables.findIndex(t => t.number === order.tableNumber);
      if (tableIndex !== -1) {
        tables[tableIndex].status = 'available';
        delete tables[tableIndex].orderId;
      }
    }

    res.json({
      success: true,
      message: `Status naročila spremenjen iz "${oldStatus}" v "${status}"`,
      order: orders[orderIndex]
    });

  } catch (error) {
    console.error('Update order status napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri posodabljanju statusa' 
    });
  }
};

// 🪑 Pridobi stanje miz
const getTables = (req, res) => {
  try {
    const { status, location } = req.query;
    
    let filteredTables = [...tables];

    // Filtriraj po statusu
    if (status) {
      filteredTables = filteredTables.filter(table => table.status === status);
    }

    // Filtriraj po lokaciji
    if (location) {
      filteredTables = filteredTables.filter(table => table.location === location);
    }

    // Dodaj informacije o naročilih za zasedene mize
    const tablesWithOrders = filteredTables.map(table => {
      if (table.status === 'occupied' && table.orderId) {
        const order = orders.find(o => o.id === table.orderId);
        return {
          ...table,
          currentOrder: order ? {
            id: order.id,
            orderNumber: order.orderNumber,
            totalPrice: order.totalPrice,
            status: order.status,
            estimatedTime: order.estimatedTime
          } : null
        };
      }
      return table;
    });

    res.json({
      success: true,
      tables: tablesWithOrders,
      summary: {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length
      }
    });

  } catch (error) {
    console.error('Get tables napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju miz' 
    });
  }
};

// 🪑 Rezerviraj mizo
const reserveTable = (req, res) => {
  try {
    const { id } = req.params;
    const { reservationTime, guests, customerName, phone } = req.body;

    const tableIndex = tables.findIndex(table => table.id === parseInt(id));
    if (tableIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Miza ni najdena'
      });
    }

    const table = tables[tableIndex];
    if (table.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Miza ni na voljo'
      });
    }

    if (guests > table.seats) {
      return res.status(400).json({
        success: false,
        message: `Miza ima samo ${table.seats} sedežev`
      });
    }

    // Preveri čas rezervacije
    const reservationDate = new Date(reservationTime);
    const now = new Date();
    
    if (reservationDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Čas rezervacije ne more biti v preteklosti'
      });
    }

    tables[tableIndex].status = 'reserved';
    tables[tableIndex].reservation = {
      userId: req.user.userId,
      customerName: customerName || '',
      phone: phone || '',
      reservationTime,
      guests,
      createdAt: new Date()
    };

    res.json({
      success: true,
      message: 'Miza uspešno rezervirana',
      table: tables[tableIndex]
    });

  } catch (error) {
    console.error('Reserve table napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri rezervaciji mize' 
    });
  }
};

// 📊 Statistike gostinstva (admin)
const getHorecaStats = (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Dostop zavrnjen - potrebne so admin pravice'
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayOrders = orders.filter(order => 
      new Date(order.createdAt) >= today
    );
    const weekOrders = orders.filter(order => 
      new Date(order.createdAt) >= thisWeek
    );

    const stats = {
      overview: {
        totalMenuItems: menuItems.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.totalPrice, 0),
        averageOrderValue: orders.length > 0 ? 
          orders.reduce((sum, order) => sum + order.totalPrice, 0) / orders.length : 0
      },
      daily: {
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, order) => sum + order.totalPrice, 0)
      },
      weekly: {
        weekOrders: weekOrders.length,
        weekRevenue: weekOrders.reduce((sum, order) => sum + order.totalPrice, 0)
      },
      popularItems: menuItems
        .map(item => ({
          ...item,
          orderCount: orders.reduce((count, order) => {
            return count + order.items.filter(orderItem => 
              orderItem.menuItemId === item.id
            ).reduce((sum, orderItem) => sum + orderItem.quantity, 0);
          }, 0)
        }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5),
      tableOccupancy: {
        available: tables.filter(table => table.status === 'available').length,
        occupied: tables.filter(table => table.status === 'occupied').length,
        reserved: tables.filter(table => table.status === 'reserved').length,
        occupancyRate: (tables.filter(table => table.status !== 'available').length / tables.length * 100).toFixed(1)
      },
      ordersByStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
      categoryPerformance: menuItems.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { items: 0, orders: 0, revenue: 0 };
        }
        acc[item.category].items++;
        
        const itemOrders = orders.filter(order => 
          order.items.some(orderItem => orderItem.menuItemId === item.id)
        );
        acc[item.category].orders += itemOrders.length;
        acc[item.category].revenue += itemOrders.reduce((sum, order) => {
          const itemRevenue = order.items
            .filter(orderItem => orderItem.menuItemId === item.id)
            .reduce((itemSum, orderItem) => itemSum + orderItem.subtotal, 0);
          return sum + itemRevenue;
        }, 0);
        
        return acc;
      }, {})
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Horeca stats napaka:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Napaka pri pridobivanju statistik' 
    });
  }
};

module.exports = {
  getMenu,
  getMenuItem,
  createOrder,
  getOrders: getUserOrders,
  updateOrderStatus,
  getTables,
  reserveTable,
  getHorecaStats
};