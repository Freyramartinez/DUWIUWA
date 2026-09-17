exports.getMapPage = (req, res) => {
  const locations = [
    {
      id: "tlahuelipan-imm",
      category: "Municipal",
      name: "Instancia Municipal de las Mujeres",
      municipality: "Tlahuelipan",
      address: "Plaza Principal S/N, Col. Centro, Tlahuelipan, Hgo.",
      phone: "773 737 0042",
      hours: "Lunes a Viernes 8:30 - 16:00 hrs",
      coordinates: { lat: 20.1264, lng: -99.2319 }
    },
    {
      id: "mixquiahuala-imm",
      category: "Municipal",
      name: "Instancia Municipal de las Mujeres",
      municipality: "Mixquiahuala de Juárez",
      address: "Calle Hidalgo S/N, Col. Centro, Mixquiahuala, Hgo.",
      phone: "738 725 0011",
      hours: "Lunes a Viernes 8:30 - 16:00 hrs",
      coordinates: { lat: 20.2289, lng: -99.2139 }
    },
    {
      id: "tula-imm",
      category: "Municipal",
      name: "Instancia Municipal de la Mujer",
      municipality: "Tula de Allende",
      address: "Plaza Principal S/N, Col. Centro, Tula de Allende, Hgo.",
      phone: "773 732 0141",
      hours: "Lunes a Viernes 8:00 - 16:00 hrs",
      coordinates: { lat: 20.0538, lng: -99.3402 }
    },
    {
      id: "tepeji-imm",
      category: "Municipal",
      name: "Instancia Municipal de las Mujeres",
      municipality: "Tepeji del Río de Ocampo",
      address: "Palacio Municipal, Col. Centro, Tepeji del Río, Hgo.",
      phone: "773 733 0058",
      hours: "Lunes a Viernes 8:30 - 16:30 hrs",
      coordinates: { lat: 19.9056, lng: -99.3444 }
    },
    {
      id: "actopan-imm",
      category: "Municipal",
      name: "Instancia Municipal de las Mujeres",
      municipality: "Actopan",
      address: "Hidalgo No. 8, Col. Centro, Actopan, Hgo.",
      phone: "772 727 0004",
      hours: "Lunes a Viernes 8:30 - 16:30 hrs",
      coordinates: { lat: 20.2687, lng: -98.9442 }
    },
    {
      id: "pachuca-cjm",
      category: "Justicia",
      name: "Centro de Justicia para Mujeres (CJM)",
      municipality: "Pachuca de Soto",
      address: "Av. San Carlos No. 118, Fracc. San Carlos, Pachuca, Hgo.",
      phone: "771 249 2400",
      hours: "Atención 24 / 7",
      coordinates: { lat: 20.0881, lng: -98.7698 }
    },
    {
      id: "pachuca-ihm",
      category: "Estatal",
      name: "Instituto Hidalguense de las Mujeres (IHM)",
      municipality: "Pachuca de Soto",
      address: "Parque Hidalgo #103, Col. Centro, Pachuca, Hgo.",
      phone: "771 718 9205",
      hours: "Lunes a Viernes 8:30 - 16:30 hrs",
      coordinates: { lat: 20.1235, lng: -98.7362 }
    },
    {
      id: "tulancingo-imm",
      category: "Municipal",
      name: "Instancia Municipal de las Mujeres",
      municipality: "Tulancingo de Bravo",
      address: "Calle Tolteca esq. Azteca, Col. Guadalupe 3ra Sección",
      phone: "775 755 8450",
      hours: "Lunes a Viernes 8:30 - 16:00 hrs",
      coordinates: { lat: 20.0822, lng: -98.3692 }
    },
    {
      id: "huejutla-imm",
      category: "Municipal",
      name: "Instancia Municipal de la Mujer",
      municipality: "Huejutla de Reyes",
      address: "Palacio Municipal S/N, Col. Centro, Huejutla, Hgo.",
      phone: "789 896 1515",
      hours: "Lunes a Viernes 8:30 - 16:00 hrs",
      coordinates: { lat: 21.1412, lng: -98.4189 }
    }
  ];

  res.render("mapa", { locations });
};