WITH v AS (SELECT id FROM assessment_versions WHERE version = '1.0')
INSERT INTO questionnaire_items (
  assessment_version_id, dimension_code, item_kind, wording,
  reverse_scored, pair_key, order_index
)
SELECT v.id, q.dimension_code, q.item_kind, q.wording, q.reverse_scored, q.pair_key, q.order_index
FROM v CROSS JOIN (VALUES
  ('ANA','structure','Avant de commencer un travail complexe, j’aime clarifier les étapes et les critères.',FALSE,'ANA_PLAN',1),
  ('REL','structure','Je repère rapidement l’état émotionnel des personnes autour de moi.',FALSE,'REL_CLIMAT',2),
  ('ACT','structure','Face à une occasion intéressante, je peux décider rapidement.',FALSE,'ACT_DECISION',3),
  ('CON','structure','Je vérifie qu’une décision reste cohérente avec les valeurs annoncées.',FALSE,'CON_VALEURS',4),
  ('CRE','structure','Une touche d’humour m’aide à entrer dans un échange.',FALSE,'CRE_TON',5),
  ('REF','structure','J’ai besoin de moments calmes pour organiser mes idées.',FALSE,NULL,6),

  ('ANA','structure','Je me sens à l’aise quand une décision repose sur des données vérifiables.',FALSE,'ANA_PRECISION',7),
  ('REL','structure','La qualité de la relation compte autant que l’efficacité de la tâche.',FALSE,NULL,8),
  ('ACT','structure','J’aime transformer une discussion en prochaine action concrète.',FALSE,NULL,9),
  ('CON','structure','Donner mon avis argumenté me vient naturellement.',FALSE,NULL,10),
  ('CRE','structure','Je réagis rapidement à ce qui me plaît ou me déplaît.',FALSE,NULL,11),
  ('REF','structure','Quand je reçois une consigne claire, je peux travailler longtemps de façon autonome.',FALSE,NULL,12),

  ('ANA','structure','Je tiens naturellement les délais et engagements annoncés.',FALSE,NULL,13),
  ('REL','structure','J’aime créer un climat accueillant avant d’aborder un sujet exigeant.',FALSE,NULL,14),
  ('ACT','structure','Les défis visibles stimulent mon engagement.',FALSE,NULL,15),
  ('CON','structure','Je m’engage fortement dans les missions auxquelles je crois.',FALSE,NULL,16),
  ('CRE','structure','J’apprends mieux quand je peux participer et expérimenter.',FALSE,NULL,17),
  ('REF','structure','Je préfère réfléchir avant de répondre à une question complexe.',FALSE,'REF_REPONSE',18),

  ('ANA','structure','Quand un problème survient, je cherche d’abord à comprendre sa logique.',FALSE,NULL,19),
  ('REL','structure','Je prends soin de formuler les désaccords avec tact.',FALSE,NULL,20),
  ('ACT','structure','Je m’adapte facilement lorsque les règles du jeu changent.',FALSE,NULL,21),
  ('CON','structure','Je remarque vite ce qui manque de cohérence dans un discours.',FALSE,NULL,22),
  ('CRE','structure','Les idées nouvelles me donnent facilement de l’énergie.',FALSE,NULL,23),
  ('REF','structure','Je visualise mentalement les étapes d’une tâche avant d’agir.',FALSE,NULL,24),

  ('ANA','structure','Je préfère une explication structurée à une consigne très générale.',FALSE,NULL,25),
  ('REL','structure','J’accorde de l’importance aux signes d’attention personnels.',FALSE,NULL,26),
  ('ACT','structure','Dans une situation tendue, je vais directement au point essentiel.',FALSE,NULL,27),
  ('CON','structure','La loyauté et la parole donnée influencent mes décisions.',FALSE,NULL,28),
  ('CRE','structure','J’aime les environnements où les échanges sont vivants.',FALSE,NULL,29),
  ('REF','structure','Un espace sans interruptions améliore nettement ma concentration.',FALSE,'REF_BRUIT',30),

  ('ANA','structure','Je vérifie les détails qui peuvent affecter la qualité du résultat.',FALSE,NULL,31),
  ('REL','structure','Les échanges chaleureux renforcent mon envie de coopérer.',FALSE,NULL,32),
  ('ACT','structure','Je préfère tester une solution plutôt que débattre longtemps de toutes les hypothèses.',FALSE,'ACT_ANALYSE',33),
  ('CON','structure','Je respecte les personnes qui défendent clairement leur point de vue.',FALSE,NULL,34),
  ('CRE','structure','Je trouve souvent une manière originale de relancer un groupe.',FALSE,NULL,35),
  ('REF','structure','Je peux rester discret tout en étant très impliqué.',FALSE,NULL,36),

  ('ANA','structure','J’organise mes priorités même quand plusieurs demandes arrivent ensemble.',FALSE,NULL,37),
  ('REL','structure','Je prends spontanément en compte l’impact d’une décision sur les personnes.',FALSE,NULL,38),
  ('ACT','structure','Je suis à l’aise pour négocier et obtenir un résultat.',FALSE,NULL,39),
  ('CON','structure','Je cherche le sens et l’utilité d’une action avant de m’y engager.',FALSE,NULL,40),
  ('CRE','structure','La variété maintient fortement mon attention.',FALSE,NULL,41),
  ('REF','structure','J’apprécie qu’on me laisse le temps d’intégrer une nouvelle information.',FALSE,NULL,42),

  ('ANA','structure','Je démarre souvent sans avoir besoin de définir un plan.',TRUE,'ANA_PLAN',43),
  ('REL','structure','Je peux travailler longtemps avec quelqu’un sans chercher à connaître son ressenti.',TRUE,'REL_CLIMAT',44),
  ('ACT','structure','J’évite généralement les décisions qui comportent une part d’incertitude.',TRUE,'ACT_DECISION',45),
  ('CON','structure','Je change facilement de position pour éviter une discussion sur le fond.',TRUE,'CON_VALEURS',46),
  ('CRE','structure','Je préfère que chaque interaction reste formelle et prévisible.',TRUE,'CRE_TON',47),
  ('REF','structure','Je donne facilement une réponse immédiate même sans temps de réflexion.',TRUE,'REF_REPONSE',48),

  ('ANA','structure','Les imprécisions me gênent peu si l’ambiance est bonne.',TRUE,'ANA_PRECISION',49),
  ('REL','structure','Un environnement froid n’affecte presque pas mon engagement.',TRUE,NULL,50),
  ('ACT','structure','Je préfère prolonger l’analyse même lorsqu’une action rapide est possible.',TRUE,'ACT_ANALYSE',51),
  ('CON','structure','Les valeurs de l’organisation ont peu d’effet sur ma motivation.',TRUE,NULL,52),
  ('CRE','structure','Les activités ludiques me distraient plus qu’elles ne m’aident.',TRUE,NULL,53),
  ('REF','structure','Le bruit et les sollicitations continues gênent peu ma concentration.',TRUE,'REF_BRUIT',54),

  ('ANA','dynamique','Ces dernières semaines, j’ai surtout besoin que mon travail et mon temps soient reconnus.',FALSE,NULL,55),
  ('REL','dynamique','Ces dernières semaines, j’ai davantage besoin de proximité et de considération.',FALSE,NULL,56),
  ('ACT','dynamique','Ces dernières semaines, j’ai davantage besoin de défis et de résultats visibles.',FALSE,NULL,57),
  ('CON','dynamique','Ces dernières semaines, j’ai particulièrement besoin que mes convictions soient entendues.',FALSE,NULL,58),
  ('CRE','dynamique','Ces dernières semaines, j’ai particulièrement besoin de variété et de stimulation.',FALSE,NULL,59),
  ('REF','dynamique','Ces dernières semaines, j’ai plus besoin qu’à l’habitude de calme et de recul.',FALSE,NULL,60),

  ('ANA','dynamique','En ce moment, je me sens mieux quand mes journées sont clairement organisées.',FALSE,NULL,61),
  ('REL','dynamique','En ce moment, les tensions relationnelles me coûtent plus d’énergie.',FALSE,NULL,62),
  ('ACT','dynamique','En ce moment, je supporte moins bien les détours et les procédures longues.',FALSE,NULL,63),
  ('CON','dynamique','En ce moment, je suis plus attentif que d’habitude au respect des engagements.',FALSE,NULL,64),
  ('CRE','dynamique','En ce moment, les tâches répétitives réduisent vite mon énergie.',FALSE,NULL,65),
  ('REF','dynamique','En ce moment, des consignes simples et séquencées me sécurisent.',FALSE,NULL,66),

  ('ANA','dynamique','Actuellement, disposer de faits précis m’aide particulièrement à avancer.',FALSE,NULL,67),
  ('REL','dynamique','Actuellement, une marque sincère d’appréciation me motive beaucoup.',FALSE,NULL,68),
  ('ACT','dynamique','Actuellement, disposer d’une marge de manœuvre me motive particulièrement.',FALSE,NULL,69),
  ('CON','dynamique','Actuellement, contribuer à une mission utile nourrit fortement ma motivation.',FALSE,NULL,70),
  ('CRE','dynamique','Actuellement, un échange détendu et vivant me remet rapidement en mouvement.',FALSE,NULL,71),
  ('REF','dynamique','Actuellement, je récupère surtout mon énergie lorsque je peux rester seul un moment.',FALSE,NULL,72)
) AS q(dimension_code, item_kind, wording, reverse_scored, pair_key, order_index);
