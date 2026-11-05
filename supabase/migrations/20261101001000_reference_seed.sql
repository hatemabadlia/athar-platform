-- Reference seeds. Only facts; see docs/DATA_SOURCES.md for sources and status.

-- Categories: product definition.
insert into public.categories (key, label_ar, label_fr, emoji, sort_order) values
  ('blood', 'تبرع بالدم', 'Don de sang', '🩸', 1),
  ('relief', 'إغاثة', 'Secours', '🏠', 2),
  ('medical', 'طبي', 'Médical', '🏥', 3),
  ('orphans', 'أيتام ومسنون', 'Orphelins et personnes âgées', '🧒', 4),
  ('education', 'تعليم', 'Éducation', '📚', 5),
  ('cleanup', 'بيئة وتنظيف', 'Environnement', '🌊', 6)
on conflict (key) do nothing;

-- Red-cell ABO/RhD compatibility (donor -> recipient). Standard transfusion reference
-- (WHO, "The Clinical Use of Blood"; AABB Technical Manual). Matching aid only, not clinical advice.
insert into public.blood_compatibility (donor, recipient) values
  ('O-','O-'),('O-','O+'),('O-','A-'),('O-','A+'),('O-','B-'),('O-','B+'),('O-','AB-'),('O-','AB+'),
  ('O+','O+'),('O+','A+'),('O+','B+'),('O+','AB+'),
  ('A-','A-'),('A-','A+'),('A-','AB-'),('A-','AB+'),
  ('A+','A+'),('A+','AB+'),
  ('B-','B-'),('B-','B+'),('B-','AB-'),('B-','AB+'),
  ('B+','B+'),('B+','AB+'),
  ('AB-','AB-'),('AB-','AB+'),
  ('AB+','AB+')
on conflict do nothing;

-- Wilayas 1–58: codes and names per Law 84-09 (1984, wilayas 1–48) and Law 19-12 (11 Dec 2019,
-- wilayas 49–58). verified=false until checked line by line against the JORADP text in this project.
-- Coordinates: approximate chef-lieu position (±0.05°), used only to centre map markers.
-- Wilayas 59–69 (2026 reform): NOT seeded — their numbering is unconfirmed; see
-- supabase/reference/wilayas_2026_pending.csv and the admin import screen.
insert into public.wilayas (code, name_ar, name_fr, lat, lng, verified, source) values
  (1,'أدرار','Adrar',27.87,-0.29,false,'Loi 84-09'),
  (2,'الشلف','Chlef',36.17,1.33,false,'Loi 84-09'),
  (3,'الأغواط','Laghouat',33.80,2.87,false,'Loi 84-09'),
  (4,'أم البواقي','Oum El Bouaghi',35.88,7.11,false,'Loi 84-09'),
  (5,'باتنة','Batna',35.56,6.17,false,'Loi 84-09'),
  (6,'بجاية','Béjaïa',36.75,5.07,false,'Loi 84-09'),
  (7,'بسكرة','Biskra',34.85,5.73,false,'Loi 84-09'),
  (8,'بشار','Béchar',31.62,-2.22,false,'Loi 84-09'),
  (9,'البليدة','Blida',36.47,2.83,false,'Loi 84-09'),
  (10,'البويرة','Bouira',36.37,3.90,false,'Loi 84-09'),
  (11,'تمنراست','Tamanrasset',22.79,5.53,false,'Loi 84-09'),
  (12,'تبسة','Tébessa',35.40,8.12,false,'Loi 84-09'),
  (13,'تلمسان','Tlemcen',34.88,-1.32,false,'Loi 84-09'),
  (14,'تيارت','Tiaret',35.37,1.32,false,'Loi 84-09'),
  (15,'تيزي وزو','Tizi Ouzou',36.71,4.05,false,'Loi 84-09'),
  (16,'الجزائر','Alger',36.75,3.06,false,'Loi 84-09'),
  (17,'الجلفة','Djelfa',34.67,3.26,false,'Loi 84-09'),
  (18,'جيجل','Jijel',36.82,5.77,false,'Loi 84-09'),
  (19,'سطيف','Sétif',36.19,5.41,false,'Loi 84-09'),
  (20,'سعيدة','Saïda',34.83,0.15,false,'Loi 84-09'),
  (21,'سكيكدة','Skikda',36.88,6.90,false,'Loi 84-09'),
  (22,'سيدي بلعباس','Sidi Bel Abbès',35.19,-0.63,false,'Loi 84-09'),
  (23,'عنابة','Annaba',36.90,7.77,false,'Loi 84-09'),
  (24,'قالمة','Guelma',36.46,7.43,false,'Loi 84-09'),
  (25,'قسنطينة','Constantine',36.37,6.61,false,'Loi 84-09'),
  (26,'المدية','Médéa',36.27,2.75,false,'Loi 84-09'),
  (27,'مستغانم','Mostaganem',35.93,0.09,false,'Loi 84-09'),
  (28,'المسيلة','M''Sila',35.70,4.54,false,'Loi 84-09'),
  (29,'معسكر','Mascara',35.40,0.14,false,'Loi 84-09'),
  (30,'ورقلة','Ouargla',31.95,5.33,false,'Loi 84-09'),
  (31,'وهران','Oran',35.70,-0.64,false,'Loi 84-09'),
  (32,'البيض','El Bayadh',33.68,1.02,false,'Loi 84-09'),
  (33,'إليزي','Illizi',26.50,8.48,false,'Loi 84-09'),
  (34,'برج بوعريريج','Bordj Bou Arréridj',36.07,4.76,false,'Loi 84-09'),
  (35,'بومرداس','Boumerdès',36.77,3.48,false,'Loi 84-09'),
  (36,'الطارف','El Tarf',36.77,8.31,false,'Loi 84-09'),
  (37,'تندوف','Tindouf',27.67,-8.15,false,'Loi 84-09'),
  (38,'تيسمسيلت','Tissemsilt',35.61,1.81,false,'Loi 84-09'),
  (39,'الوادي','El Oued',33.37,6.86,false,'Loi 84-09'),
  (40,'خنشلة','Khenchela',35.43,7.14,false,'Loi 84-09'),
  (41,'سوق أهراس','Souk Ahras',36.29,7.95,false,'Loi 84-09'),
  (42,'تيبازة','Tipaza',36.59,2.44,false,'Loi 84-09'),
  (43,'ميلة','Mila',36.45,6.26,false,'Loi 84-09'),
  (44,'عين الدفلى','Aïn Defla',36.26,1.97,false,'Loi 84-09'),
  (45,'النعامة','Naâma',33.27,-0.31,false,'Loi 84-09'),
  (46,'عين تموشنت','Aïn Témouchent',35.30,-1.14,false,'Loi 84-09'),
  (47,'غرداية','Ghardaïa',32.49,3.67,false,'Loi 84-09'),
  (48,'غليزان','Relizane',35.74,0.56,false,'Loi 84-09'),
  (49,'تيميمون','Timimoun',29.26,0.23,false,'Loi 19-12'),
  (50,'برج باجي مختار','Bordj Badji Mokhtar',21.33,0.95,false,'Loi 19-12'),
  (51,'أولاد جلال','Ouled Djellal',34.42,5.06,false,'Loi 19-12'),
  (52,'بني عباس','Béni Abbès',30.13,-2.17,false,'Loi 19-12'),
  (53,'عين صالح','In Salah',27.20,2.47,false,'Loi 19-12'),
  (54,'عين قزام','In Guezzam',19.57,5.77,false,'Loi 19-12'),
  (55,'تقرت','Touggourt',33.10,6.06,false,'Loi 19-12'),
  (56,'جانت','Djanet',24.55,9.48,false,'Loi 19-12'),
  (57,'المغير','El M''Ghair',33.95,5.92,false,'Loi 19-12'),
  (58,'المنيعة','El Meniaa',30.58,2.88,false,'Loi 19-12')
on conflict (code) do nothing;
