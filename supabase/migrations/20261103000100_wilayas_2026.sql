-- Wilayas 59–69 created by the 2025–2026 territorial reform (total 69 wilayas).
-- Numbering and names as reported from Journal officiel n° 40 (2026) by Algerie360
-- ("Les 11 nouvelles wilayas en Algérie : voici les noms et numéros officiels") and
-- Wikipedia "Provinces of Algeria" (citing TSA). verified=false until checked against the JORADP text.
-- Coordinates: approximate chef-lieu position, used only to centre map markers.
insert into public.wilayas (code, name_ar, name_fr, lat, lng, verified, source) values
  (59,'آفلو','Aflou',34.11,2.10,false,'JO n°40 (2026) via presse'),
  (60,'بريكة','Barika',35.39,5.37,false,'JO n°40 (2026) via presse'),
  (61,'القنطرة','El Kantara',35.22,5.71,false,'JO n°40 (2026) via presse'),
  (62,'بئر العاتر','Bir El Ater',34.74,8.06,false,'JO n°40 (2026) via presse'),
  (63,'العريشة','El Aricha',34.22,-1.27,false,'JO n°40 (2026) via presse'),
  (64,'قصر الشلالة','Ksar Chellala',35.21,2.32,false,'JO n°40 (2026) via presse'),
  (65,'عين وسارة','Aïn Oussera',35.45,2.91,false,'JO n°40 (2026) via presse'),
  (66,'مسعد','Messaad',34.15,3.50,false,'JO n°40 (2026) via presse'),
  (67,'قصر البخاري','Ksar El Boukhari',35.89,2.75,false,'JO n°40 (2026) via presse'),
  (68,'بوسعادة','Bou Saâda',35.21,4.17,false,'JO n°40 (2026) via presse'),
  (69,'الأبيض سيدي الشيخ','El Abiodh Sidi Cheikh',32.90,0.55,false,'JO n°40 (2026) via presse')
on conflict (code) do nothing;
