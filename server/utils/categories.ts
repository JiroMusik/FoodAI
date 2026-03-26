export const mapCategory = (rawCategory: string, productName: string): string => {
  const text = `${rawCategory} ${productName}`.toLowerCase();

  // Gewürze & Saucen ZUERST — viele Gewürze werden sonst als Gemüse/Fleisch/Getränke gematcht
  if (text.match(/gewürz|spice|sauce|condiment|salz\b|pfeffer|ketchup|mayo|remoulade|senf|essig|öl\b|olivenöl|dressing|marinade|brühe|bouillon|fond|soja|worcester|tabasco|sriracha|pesto|curry|kurkuma|kümmel|basilikum|rosmarin|oregano|thymian|petersilie|schnittlauch|dill|muskatnuss|paprika.*scharf|chili|peperoncin|ras el hanout|garam masala|zimt|nelke|anis|koriander|knoblauch.*granul|zwiebel.*pulver|sesam.*paste|tahina|saucenbinder|röstzwiebel|hackfleisch.*würz|steak.*pfeffer|pizza.*gewürz|pasta.*würz|bolognese.*gewürz|ankerkraut|fuchs|ostmann|ubena|cornichon|olive|kapern|gewürzzubereitung/)) return 'Gewürze & Saucen';
  // Tiefkühl (hat Vorrang vor Fleisch/Fisch)
  if (text.match(/frozen|tiefkühl|tiefgefroren|tk[ -]|ice cream|eis am stiel|pizza.*frozen|iglo|frosta|bofrost|gefrier|golden longs|rösti.*stäbchen/)) return 'Tiefkühl';
  // Kühlregal
  if (text.match(/dairy|milk|cheese|yogurt|milch|käse|joghurt|butter|cream|sahne|quark|schmand|skyr|frischkäse|aufschnitt|aufstrich|margarine|\bei\b|eier|creme fraiche|mascarpone|ricotta|mozzarella|grana padano|parmesan|kochsahne|vollmilch|creme fine|creme legere|schmetten|sauerrahm|topfen|hüttenkäse|philadelphia|bresso/)) return 'Kühlregal';
  // Fleisch & Fisch (nach Gewürze — damit "Rinder Bouillon" nicht hier landet)
  if (text.match(/meat|poultry|beef|pork|chicken|fleisch|hähnchen|wurst|würstchen|dörffler|schinken|salami|lachs|thunfisch|garnele|hack\b|rind.*steak|rind.*filet|rind.*roast|schwein|pute|truthahn|shrimp|pangasius|forelle|fish.*filet|fisch.*stäbchen/)) return 'Fleisch & Fisch';
  // Backwaren
  if (text.match(/bread|bakery|pastry|brot|brötchen|toast|kuchen|croissant|baguette|semmel|lauge|donut|muffin|teig|blätterteig|pizzateig|brioche|bun\b|hotdog.*roll|hotdog.*brød|sandwich|wrap|tortilla/)) return 'Backwaren';
  // Obst & Gemüse
  if (text.match(/fruit|vegetable|obst|gemüse|apple|banana|tomato|potato|apfel|banane|tomate|kartoffel|gurke|paprika|zwiebel\b|knoblauch\b|ingwer|salat|beere|pilz|champignon|karotte|möhre|brokkoli|zucchini|schalott|scharlott/)) return 'Obst & Gemüse';
  // Getränke
  if (text.match(/beverage|drink|water|juice|getränk|wasser|saft|cola|beer|wine|bier|wein|limonade|sprudel|kaffee|tee|milch.*drink/)) return 'Getränke';
  // Snacks & Süßigkeiten
  if (text.match(/snack|sweet|candy|chocolate|chips|süßigkeit|schokolade|keks|gummibärchen|riegel|nuss|nüsse/)) return 'Snacks & Süßigkeiten';
  // Haushalt & Drogerie
  if (text.match(/cleaning|hygiene|paper|household|haushalt|drogerie|seife|shampoo|waschmittel|spülmittel|papier|beutel|folie|schwamm/)) return 'Haushalt & Drogerie';
  // Vorratsschrank (Fallback für alles was lange hält)
  if (text.match(/pasta|rice|cereal|flour|sugar|noodle|reis|mehl|zucker|konserve|dose|canned|passierte tomaten|gehackte tomaten|tomatenmark|haferflocken|müsli|nudeln|spaghetti|spaghettoni|makkaroni|hörnchen|lasagne|penne|fusilli|linse|bohne|kidney|erbse|rotkohl|honig|blütenhonig|artischock|puder.*zucker|risi.*bisi/)) return 'Vorratsschrank';
  
  return 'Sonstiges';
};
