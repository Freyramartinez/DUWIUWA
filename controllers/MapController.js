// controllers/MapController.js
// Controlador para la vista del mapa de puntos de atención.
// ⚠️ Los datos de PLACES y SECURITY son de ejemplo/aproximados;
//    verifica coordenadas y datos antes de publicar en producción.

const PLACES = [
    { name: "Instancia Municipal de las Mujeres", category: "Municipal", tag: "municipal", municipio: "Tlahuelipan",       address: "Plaza Principal S/N, Col. Centro, Tlahuelipan, Hgo.",               lat: 20.1339, lng: -99.0995 },
    { name: "Instancia Municipal de la Mujer",    category: "Municipal", tag: "municipal", municipio: "Mixquiahuala",       address: "Palacio Municipal, Col. Centro, Mixquiahuala de Juárez, Hgo.",     lat: 20.2278, lng: -99.2153 },
    { name: "Instancia Municipal de las Mujeres", category: "Municipal", tag: "municipal", municipio: "Tula de Allende",    address: "Presidencia Municipal, Col. Centro, Tula de Allende, Hgo.",        lat: 20.0553, lng: -99.3428 },
    { name: "Fiscalía Especializada en Delitos de Violencia contra las Mujeres", category: "Estatal", tag: "estatal", municipio: "Pachuca de Soto", address: "Fiscalía General del Estado de Hidalgo, Pachuca de Soto, Hgo.", lat: 20.1234, lng: -98.7346 },
    { name: "Centro de Justicia para las Mujeres de Hidalgo", category: "Estatal", tag: "estatal", municipio: "Pachuca de Soto", address: "Pachuca de Soto, Hgo.", lat: 20.1011, lng: -98.7591 },
    { name: "Instancia Municipal de las Mujeres", category: "Municipal", tag: "municipal", municipio: "Actopan",             address: "Palacio Municipal, Col. Centro, Actopan, Hgo.",                    lat: 20.2678, lng: -98.9436 },
    { name: "Juzgado de lo Familiar",             category: "Estatal",   tag: "estatal",  municipio: "Tulancingo de Bravo",  address: "Tulancingo de Bravo, Hgo.",                                        lat: 20.0842, lng: -98.3667 },
    { name: "Instancia Municipal de las Mujeres", category: "Municipal", tag: "municipal", municipio: "Ixmiquilpan",         address: "Palacio Municipal, Col. Centro, Ixmiquilpan, Hgo.",                lat: 20.4842, lng: -99.2178 }
];

const SECURITY = [
    { name: "Secretaría de Seguridad Pública de Hidalgo",  category: "Estatal",   tag: "estatal",   municipio: "Pachuca de Soto",    address: "Blvd. Felipe Ángeles S/N, Pachuca de Soto, Hgo.",    lat: 20.1120, lng: -98.7650 },
    { name: "Policía Municipal",                            category: "Municipal", tag: "municipal", municipio: "Pachuca de Soto",    address: "H. Ayuntamiento de Pachuca, Hgo.",                    lat: 20.1174, lng: -98.7324 },
    { name: "Centro C4 Hidalgo",                           category: "Estatal",   tag: "estatal",   municipio: "Pachuca de Soto",    address: "Pachuca de Soto, Hgo.",                               lat: 20.1060, lng: -98.7480 },
    { name: "Policía Municipal",                            category: "Municipal", tag: "municipal", municipio: "Tula de Allende",    address: "Presidencia Municipal, Tula de Allende, Hgo.",        lat: 20.0580, lng: -99.3410 },
    { name: "Policía Municipal",                            category: "Municipal", tag: "municipal", municipio: "Tulancingo de Bravo", address: "H. Ayuntamiento, Tulancingo de Bravo, Hgo.",         lat: 20.0870, lng: -98.3700 },
    { name: "Policía Municipal",                            category: "Municipal", tag: "municipal", municipio: "Actopan",            address: "Palacio Municipal, Actopan, Hgo.",                    lat: 20.2700, lng: -98.9450 },
    { name: "Policía Municipal",                            category: "Municipal", tag: "municipal", municipio: "Ixmiquilpan",        address: "Palacio Municipal, Ixmiquilpan, Hgo.",                lat: 20.4860, lng: -99.2200 },
    { name: "Policía Municipal",                            category: "Municipal", tag: "municipal", municipio: "Mixquiahuala",       address: "Palacio Municipal, Mixquiahuala de Juárez, Hgo.",     lat: 20.2290, lng: -99.2170 }
];

// GET /mapa
const getMap = (req, res) => {
    res.render("mapa", {
        title: "Puntos de Atención - Women Safety",
        places: PLACES,
        security: SECURITY
    });
};

// GET /api/places  — endpoint JSON por si lo necesitas en el futuro
const getPlaces = (req, res) => {
    const { type, municipio } = req.query;

    let result = type === "seguridad" ? [...SECURITY] : [...PLACES];

    if (municipio) {
        const term = municipio.toLowerCase();
        result = result.filter(p => p.municipio.toLowerCase().includes(term));
    }

    res.json({ success: true, data: result });
};

module.exports = { getMap, getPlaces };
