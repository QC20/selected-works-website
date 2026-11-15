/**
 * The television's lineup: which Internet Archive tapes each channel plays.
 * -------------------------------------------------------------------------
 * Read by `tools/tv-schedule.js`, never by the browser. Every entry is an
 * Archive identifier (archive.org/details/<id>), picked by hand from the
 * candidates `node tools/tv-schedule.js discover '<query>'` lists. The bake
 * still checks every one — a tape that has been withdrawn, has no rendition a
 * browser can stream, runs too long for its channel or is dated after 1999 is
 * dropped with a warning rather than scheduled.
 *
 * Channel identity (number, name, slot length, whether its breaks carry
 * commercials) lives in `src/components/os/channels.ts`; this file is only
 * the tapes. Entry forms:
 *
 *     'identifier'                         the item's main video
 *     { id, year: 1947 }                   override a wrong Archive date
 *     { id, files: 'all' }                 every video in a multi-file item
 *     { seq: ['part1', 'part2'] }          parts that must air together, in order
 *
 * What was left out, and why, so nobody adds it back by accident:
 *
 *   - Anything from an open-upload pool picked by a search. That is how the
 *     old set ended up showing a Quran recitation on "News Desk".
 *   - Cartoons and newsreels built on racial caricature or atrocity footage,
 *     which the 1930s and 40s produced plenty of. The filters in the curation
 *     script dropped titles; these lists were then read by eye.
 *   - Cigarette commercials, of which the 1950s produced even more.
 *   - Complete-series uploads of shows still under copyright. Everything
 *     here is from a curated collection or a public-domain episode.
 */

module.exports = {
    /**
     * Single spots, 10 seconds to three minutes, for the breaks between
     * programmes on every channel that carries advertising.
     */
    ads: [
    'Breakfas1939', // Breakfast Pals (1939)
    'Cheerios1960', // Cheerios/V-8 (1960)
    'ExtraEss1938', // Extra (Esso Screen Ad) (1938)
    'TimeSave1936', // Time Savers for House Makers (1936)
    'FilmMyst1937', // Film Mystery, A (Dreft Screen Ad) (1937)
    'Frigidai1957', // Frigidaire Finale 1957 (1957)
    'Mullinai1953', // Mullinaires, The (1953)
    'Wonderfu1960', // Wonderful New World of Fords, A (1960 Ford Spot) (1960)
    'Oldsmobi1941_4', // Oldsmobile Presents the "Seventy" B-44 (1942 Oldsmobile Playlets) (1941)
    'OldsMinu1948', // Olds Minute Movies [Futuramic 1948] (1948)
    'UNIVAC-AD-2', // Fifties Advertising: UNIVAC Computer Commercial (5 February 1956) (Ad (1956)
    'DuMont_Set_Commercial', // Classic Commercial for Du Mont Laboratories Television Sets (1949)
    'Zarbon_Eats_Little_Children', // A 5th Classic Commercial for Coca-Cola (20/January/1955) (1955)
    'Sugar_Crisps_Ad1', // Classic Commercial for Post's Sugar Crisps
    'DeSoto5', // Classic Car Commercial: 1955 DeSoto
    'Coke_Commercial', // Classic Coca-Cola Commercial from 1954 (1954)
    'ShastaSodaCommercial-Frankenstein', // Shasta soda commercial - Frankenstein
    'Better_Than_The_Betty_Hutton_Show', // Classic Commercial for Kellogg's Sugar Smacks (1954)
    'lionel01', // Astro Missel Fireing Car (1962)
    'Promo_Jetsons_ABC-TV_1963', // Promo_Jetsons_ABC-TV_1963
    'DeSoto4', // Classic Car Commercial: DeSoto
    'Mokuba_Is_Cuddly_and_Loves_Classic_TV', // A 3rd Classic Commercial for Coca-Cola (1953) (1953)
    'deluxemeninspace', // Deluxe Men in Space - 1960 Toy Commercial
    'idealcountdown', // Ideal Countdown - 1962 Toy Commercial (1962)
    'ClassicCommercialMetrecalDietDrink1965', // Classic Commercial: Metrecal Diet Drink (1965)
    'Bob_Ray_Beer', // Bob Elliott Ray Goulding 1950's beer commercial
    'ToniDippityDooCommercials', // Toni - Dippity Doo TV Commercials
    '1977GentlemenPreferHanesPantyhose', // Hanes Pantyhose (1977)
    'LostInSpacePromo', // Lost In Space promo (1965)
    'Chevrolet_Commercial_1956', // 1956 Chevrolet Commercial
    'Mary_Hartline_doll', // Classic Television Commercial for "The Mary Hartline Doll" (1954)
    'MAJORMATTMASONTOYCOMMERCIAL1966', // MAJOR MATT MASON TOY COMMERCIAL 1966
    'FrankenberryCountChoculaTevevisionCommercial', // Franken Berry / Count Chocula : Tevevision Commercial 1971 (1971)
    'PontiacGto1966CarCommercialTvAd', // Pontiac GTO 1966 car commercial TV ad (1966)
    'DeSoto7', // Classic Car Commercial: ''Movie Star'' DeSoto Commercial
    'FordMustang1966CarCommercial1960sTvAd', // Ford Mustang 1966 car commercial, 1960s TV ad
    '1970sTvCommercialsWithTeriGarr', // 1970s TV commercials with Teri Garr
    'AmericanExpressTravelersChequesCommercial', // American Express Traveler's Cheques Commercial
    'JohnWayne-Vintage50sXmasSealsCommercial1955', // John Wayne - vintage 50s Xmas Seals commercial (1955)
    'QuispCerealTelevisionCommercial1966', // Quisp Cereal : Television Commercial : 1966
    'DeSoto8', // Classic 1950's DeSoto Car Commercial with Famous TV Host
    'Dove_Soap_2', // Classic Commercial: Dove Soap #2 (1957) (1957)
    'Promo_Hogans_Heroes_CBS_TV_1967', // Promo_Hogans_Heroes_CBS_TV_1967
    'Peanut_Butter_Commercial', // Classic Commercial: Skippy Peanut Butter
    'October5-1952-Shampoo', // Classic Commercial for Finesse Flowing Creme Shampoo (October 5, 1952) (1952)
    'ThingsGoBetterWithCoke', // Things Go Better With Coke
    'Camay', // Classic Sixties Commercial for "Camay Soap" (1960)
    '1958_Chicken_Butt', // Classic 1958 Commercial for Jell-O Pudding with Johnny Carson (1958)
    'FlintstonesVitamins', // Flintstones Vitamins
    'Duncan_Hines_1960_Uploaded_By_Yugi-Moto', // Classic Commercial for Duncan Hine's Cake Mix (1960) (1960)
    'Dove_Soap', // Classic Commercial: Dove Soap (1957) (1957)
    'Three-Musketeers-Commercial-1', // Classic Candy Commercial: Classic "Three Musketeers" Candy commercial
    '1965ClassicCommercialForcueToothpaste', // 1965 Classic Commercial for ''Cue Toothpaste'' (1965)
    'DorothyGrayCosmeticsAd-1950s', // Dorothy Gray Cosmetics Ad - 1950s
    'Promo_F_Troop_ABC-TV_1965_Tuesday_night', // Promo_F_Troop_ABC-TV_1965_Tuesday_night
    '1968JenosPizzaRollsWithTheLoneRanger', // Jeno's Pizza Rolls with The Lone Ranger (1968)
    '1971RockFlowersDollsCommercial', // 1971 "Rock Flowers" Mattel Doll Commercial (1971)
    'ABCFridayNight1970', // ABC Family Night (1970)
    'AndyGriffithPost', // AndyGriffithPost
    'DeSoto2', // Classic Car Commercial: 1954 DeSoto
    'Ivory_Snow', // Classic Commercial for "Ivory Snow" Washing Powder (1960) (1960)
    'Coca-Cola_2_Uploaded_By_Prince_Vegeta', // Classic Television for Coca-Cola (Number 2) (1954)
    'WessonOil_DoYouReadTheLabels', // Wesson Oil TV Commercial: Do You Read The Labels (1950)
    'Roast_Lamb_with_Gravy', // A 4th Classic Commercial for Coca-Cola (29/September/1954) (1954)
    'WestinghouseFrostFreeRefrigerators', // Westinghouse Frost Free Refrigerators
    'MontgomeryWardPachinkoAd', // Montgomery Ward Pachinko Ad
    '1960sHartsBreadSnoopyVsTheRedBaron', // Hart's Bread "Snoopy Vs The Red Baron"
    'Video-Ranger_ring', // Classic Commercial for ''Video Ranger ring'' (c. 1950) (1950)
    'TheSixMillionDollarManDannysInfernoPromo', // The Six Million Dollar Man - "Danny's Inferno" promo (1977)
    'Promo_Hootenanny_ABC-TV_1963_Saturday_Night', // Promo_Hootenanny_ABC-TV_1963_Saturday_Night
    'Chicken_Butt_9', // A 9th Fabulous Classic Commercial for DeSoto
    'AnotherDumontTelevisionSetCommercial', // Another Dumont Television Set Commercial
    '1977CocaColaCokeAddsLife', // Coca-Cola (Coke Adds Life) (1977)
    'ClassicTvCommercialLadySunbeamHairDryer1965', // Classic TV Commercial: Lady Sunbeam Hair Dryer (1965)
    'Promo_Honey_West_ABC-TV_1965_Friday_night', // Promo_Honey_West_ABC-TV_1965_Friday_night
    'Classic1965CommercialForArridDeodorant', // Classic 1965 Commercial for Arrid Deodorant (1965)
    '1959EdselCommercial_754', // 1959 EDSEL COMMERCIAL
    'Promo_Gidget_ABC-TV_1965_Wednesday_night', // Promo_Gidget_ABC-TV_1965_Wednesday_night
    '1968TalkingBarbieAndStaceyDolls', // Talking Barbie & Stacey Dolls with Eve Plumb (1968)
    'Dove-_-_Old_Spice', // Classic Commercial: Dove Soap & Shulton Old Spice (1957)
    'TheMunstersAtMarineland', // Marineland Carnival promo with The Munsters (1965)
    '1963BufferinTvCommercialAd', // 1963 Bufferin TV commercial ad
    '1977AlmondJoyMounds', // Almond Joy and Mounds Candy Bars (1977)
    'VintageColgateToothpasteCommercial', // Vintage Colgate Toothpaste Commercial
    '1977HaveAPepsiDay', // Have a Pepsi Day (1977)
    '1977PlaytexSeamlessSupportCanBeBeautifulBra', // Playtex Seamless Support Can Be Beautiful Bra (1977)
    'CevroletFor1964AirielCommercial', // Chevrolet for 1964 Airiel Commercial
    'I_Hate_MyNetworkTV', // Classic Commercial for Lilt Hair (1955)
    '1977HappyDaysFonzieLovesPinkyPromo', // Happy Days/Fonzie Loves Pinky promo (1977)
    'Post_Sugar_Crisps_2', // Classic Commercial for Post's Sugar Crisps (Number 2)
    'AmcAmbassadorCommercial', // AMC Ambassador commercial
    '1950sTelevisionCommercialBlueMagicCheerad1', // 1950's Television Commercial: Blue Magic Cheer (Ad 1)
    'ThisFiftiesAdConfusesGoku', // Out of Context 1950's Commercial: Listerine Toothpaste
    '1977PillsburyPlusPuddingCake', // Pillsbury Plus Pudding Cake Mix (1977)
    'ClassicCommercialKen-lRationDogFood1959', // Classic Commercial: Ken-L Ration Dog Food (1959)
    'Remington1955', // Classic Commercial for the Remington Rand Shaver (October 2nd 1955) (A (1955)
    '1977CarnationInstantMilkWithVickiLawrence', // Carnation Instant Milk with Vicki Lawrence (1977)
    '1977ChevroletConcours', // 1977 Chevrolet Concours (1977)
    'DeSoto6', // Classic Car Commercial: DeSoto (Ad Number 6)
    'Blue_Cheer', // Classic Fifties Commercial for "Blue Cheer" (Ad 2) (1955)
    '1976KFCCommercial', // Real Goodness from Kentucky Fried Chicken (1976)
    '1977GoldenGrahamsCereal', // Oh, Those Golden Grahams! (1977)
    'BewitchedClairolCommercial', // Bewitched Clairol Commercial
    'Listerine1ApprovedByGoku', // Fifties Television Commercial for Listerine
    '1977BellTelephoneSuperSwitcher', // Bell Telephone's Super-Switcher (1977)
    'Jeice_Is_In_Hell', // Classic 1960's Commercial for ''Dash'' (1960)
    'Promo_He__She_CBS_TV_1967', // Promo_He__She_CBS_TV_1967
    '1964CapnCrunchBreakfastOnTheGuppy', // Cap'n Crunch "Breakfast On The Guppy" (First Commercial) (1964)
    'TheHardyBoysNancyDrewMysteriesPromo', // The Hardy Boys/Nancy Drew Mysteries promo (1977)
    '1976CampbellsChickenNoodleOsSoup', // Campbell's Chicken Noodle O's Soup (1976)
    '1977PurinaCatChow', // Purina Cat Chow (1977)
    '1977DelMonteCornWithBillCosby', // Del Monte Corn with Bill Cosby (1977)
    'Video-Ranger-Ring-3', // Another classic commercial for the ''Video Ranger ring'' (1950)
    '58EdselCommercialWithwagonTrainId', // 58 EDSEL COMMERCIAL WITH 'WAGON TRAIN" ID
    '1960sMarsAlmondBars', // Mars Almond Bars with Kathleen Beller & Parker Stevenson
    '005MobileGasCommercial59sec', // 005 MOBILE GAS COMMERCIAL 59SEC
    '1969BarbieAndFriends', // Barbie & Friends dolls with Maureen McCormick (1969)
    '1976SoftDriAntiperspirant', // Soft & Dri Antiperspirant (1976)
    '1977FutureCopThreesCompanyPromo', // Future Cop/Three's Company promo (1977)
    'DeSoto3', // Classic Car Commercial: 1954 DeSoto (No2)
    'lets-disco-1978-commercial', // Let's Disco 1978 Commercial (1978)
    '1974KleanNShine', // Klean 'n Shine with Florence Henderson (1974)
    '1977USSavingsBondsTheAntTheGrasshopper', // US Savings Bonds: The Ant & The Grasshopper (1977)
    'SinclairNickleGasolineCommercial58sec', // Sinclair Nickle Gasoline Commercial 58sec
    '1977ChevroletWithJerryOrbach', // 1977 Chevrolet with Jerry Orbach (1977)
    '1977TheEasterBunnysComingToTownPromo', // The Easter Bunny's Comin' To Town promo (1977)
    '1977EightIsEnoughPromos', // Eight Is Enough promos (1977)
    'BorisKarloffRonsonCometLighter1968', // Ronson Comet Lighter with Boris Karloff (1968)
    'thesimpsonskfccommercialscanadaonly1993', // The Simpsons KFC Commercials Canada Only (1993) (1993)
    '1977BlanskysBeautiesFishStarskyHutch', // Blansky's Beauties/Fish/Starsky & Hutch promo (1977)
    'UnitedAirlinesBurgessMeredith', // United Airlines with Burgess Meredith narration (1972)
    '1967Listerine', // Listerine Commercial (1967)
    '1976KinneyShoesWithKenBerry', // Kinney Shoes with Ken Berry (1976)
    '1977BoyScoutsOfAmerica', // The Boy Scouts Of America (1977)
    'DickVanDykeShowCastCommercials', // Dick Van Dyke Show cast commercials
    'Promo_The_Good_Guys_CBS_TV_1968', // Promo, The Good Guys CBS TV 1968
    '1992-uan-2', // More 1992 USA Up All Night Bumpers/Commercialz #tuneintrashout (1992)
    'Promo__The_F.B.I._ABC-TV_1965_Sunday_night', // Promo__The_F.B.I._ABC-TV_1965_Sunday_night
    '003BardahlAutoEngineAdditiveCommercial57Sec', // 003 BARDAHL Auto Engine Additive Commercial 57 SEC
    'ClassicTelevisionCommercialForblueCheerad3', // Classic Television Commercial for ''Blue Cheer'' (Ad 3)
    '1977SingerSewingMachinesWithDebbieReynolds', // Singer Sewing Machines sale with Debbie Reynolds (1977)
    'TriscuitsBettyBuckley', // Triscuits with Betty Buckley (1976)
    'CircusMixedNuts', // Circus Mixed Nuts
    'disney-fantasia-vhs-advert', // Disney Fantasia VHS Advert (1992)
    'CareFreeSugarlessGumWithDenaDietrich', // Care Free Sugarless Gum With Dena Dietrich (1976)
    'SugarCrisp', // Sugar Crisp
    '1979-disco-dance-machine-commercial', // 1979 Disco Dance Machine Commercial (1979)
    '004CitiesServiceGasolineCommercial1min', // 004 CITIES SERVICE GASOLINE COMMERCIAL 1MIN
    '1976Fotomat', // Fotomat's Picture Pickup Promise (1976)
    'RemingtonRand2', // Classic Commercial: Remington Rand Shaver (21 Feb 1954) (1954)
    'AMessageFromJamesGarner', // A Message From James Garner (1958)
    'RemingtonRandWMLStopette', // Classic Commercial: Remington Rand & Stopette (21 Feb 1954) (1954)
    'CutexNailPolish1960TVCommercialXvid', // Cutex Nail Polish 1960 TV Commercial
    '1977GravyTrainDogFoodWithJuneLockhart', // Gravy Train Dog Food with June Lockhart (1977)
    '1985sony', // Sony Trinitron (1985) (1985)
    'thesimpsonstoyotacommercials19921993', // The Simpsons Toyota Commercials ( 1992 -1993) (1992)
    '002AtlanticAutoAddativeCommercial39Sec', // 002 ATLANTIC AUTO ADDATIVE COMMERCIAL 39 SEC
    '90s-commercials-1997480p', // USA Network 1997 Commercial Collection (1997)
    'KnowingHowToShave', // Fifties Advertising: Remington Rand Shaver , ''Tune In Next Week'', St (1955)
    'FitwearSocks1961TVCommercialXvid', // Fitwear Socks 1961 TV Commercial
    'AMessageFromWalterBrennan', // A Message From Walter Brennan
    'toys-r-us-commercial-from-1978-disco', // Toys R Us Commercial From 1978 Disco (1978)
    'mickey-mouse-disco-record-offer-1979', // Mickey Mouse Disco ( Record Offer, 1979) (1979)
    'bugs-bunnys-easter-funnies-promo-1989', // Bugs Bunny's Easter Funnies Commercial (1989) (1987)
    '000706_202006', // Microsoft Combat Flight Simulator Commercial
    '90s-commercials-1994480p_202303', // Fox December 1994 Commercial Collection (1994)
    '1980-joujou-jeans-commercial-disco', // 1980 Joujou Jeans Commercial Disco (1980)
    '1987-spinning-burger', // 1987 "Mac Tonight, Spinning Burger" Commercial (1987)
    'yt-5s.com-90s-commercials-1998-480p_202210', // October 1998 CBS Commercials Collection (1998)
    'yt-5s.com-90s-commercials-1994-480p-1', // November 1994 Fox Kids Commercial Collection 8 (1994)
    'coca-cola-advert', // Coca Cola Advert (1992)
    'yt-5s.com-90s-commercials-1999-480p_20221023', // Kids WB Summer 1999 Commercial Collection (1999)
    'shadows-book-advert', // Star Wars: Shadows Of The Empire Book (1997) TV Commercial (1997)
    'atari-2600-1986-television-commercial-480p', // Atari 2600 Commercial: "Atari Rap" (1986)
    'yt-5s.com-90s-commercials-1998-480p_20221001', // Kids WB December 1998 Commercial Collection 3 (1998)
    'battlestargalacticatoys', // Mattel Battlestar Galactica Cylon Toy Commercial (1979) (1979)
    'yt-5s.com-90s-commercials-1997-480p_202210', // USA Network June 1997 Commercial Collection (1997)
    'star-trek-vi-the-undiscovered-country-advert', // Star Trek VI: The Undiscovered Country Advert (1992)
    '90s-commercials-1994480p-1_202303', // Fox March 1994 Commercial Collection (1994)
    'cartoon-network.com-commercial-droopy', // CartoonNetwork.com Commercial: Droopy (1998)
    'GoddardsSilverDip195920secTVCommercialXvid', // Goddards Silver Dip 1959 20sec TV Commercial
    'ultra-brite-roller-disco-commercial-1982', // Ultra Brite Roller Disco Commercial 1982 (1982)
    '90s-commercials-1994480p', // Fox September 1994 Commercial Collection (1994)
    'microsoft-windows-95-commercial-1995', // Microsoft Windows 95 Commercial 1995 (1995)
    'star-wars-posters-retrto', // Star Wars Posters at Burger Chef (70's Commercial) (1977)
    'QuakerOatsWilfordBrimelyCommercial', // Quaker Oats Wilford Brimely Commercial
    'yt-5s.com-90s-commercials-1994-480p_202210', // October 1994 Fox Kids Commercial Collection (1994)
    'yt-5s.com-90s-commercials-1999-480p_20221026', // Kids WB April 1999 Commercial Collection 7 (1999)
    'MicrosoftWindows95Advert1996', // Microsoft Windows 95 Advert (1996)
    'yt-5s.com-90s-commercials-1999-480p_20221018', // Kids WB April 1999 Commercial Collection 3 (1999)
    'AMessageFromErnestBorgnine', // A Message From Ernest Borgnine
    'oldcommercialforcarnationmilk', // Old Commercial For Carnation Milk (1950)
    'michelle-pfeiffer-lux', // Michelle Pfeiffer - LUX Soap (1979) TV Commercial
    'HoovermaticTwinTub1961TVCommercialXvid', // Hoovermatic Twin Tub 1961 TV Commercial
    'BigBenPies1961TVCommercialXvid', // Big Ben Pies 1961 TV Commercial
    'ChardonJeans1980TVAd', // Chardon Jeans commercial (USA, 1980) (1980)
    'princess-bride-promo-1991', // "The Princess Bride" Australian TV premiere promo (1991) (1991)
    'showbiz-local-1987', // Showbiz Pizza Local 1987 Ad *Rare* (1987)
    'yt-5s.com-90s-commercials-1999-480p_202210', // Kids WB April 1999 Commercial Collection 2 (1999)
    'chilis-baby-back-ribs-commercial-1997', // Chili's Baby Back Ribs Commercial 1997
    'yt-5s.com-90s-commercials-1994-480p_20221020', // November 1995 Fox Kids Commercial Collection 10 (1994)
    '1997-hanes-her-way-commercial-360p', // Hanes Her Way Commercial: "Trampoline in the Moonlight" (1997)
    'yt-5s.com-80s-commercials-late-80s-480p', // 1987 CBS Christmas Commercial Collection 2 (1987)
    'bodyssage-infomercial-1995', // Bodyssage Infomercial 1995 (1995)
    'NJY-012_290367-290667', // Married with Children Season Finale Promo FOX/WPMT 43 1995-05-21 (1995)
    'yt-5s.com-90s-commercials-1999-480p', // Kids WB April 1999 Commercial Collection (1999)
    'diet-pepsi-advert', // Diet Pepsi Advert (1992)
    'yt-5s.com-90s-commercials-1998-480p', // Kids WB December 1998 Commercial Collection (1998)
    'mp2jun060150190', // James Taylor's Hourglass on CD (1997 Commercial) (1997)
    'yt-5s.com-90s-commercials-1998-480p_202209', // Kids WB December 1998 Commercial Collection 2 (1998)
    'thunderbird-commercial-disco-style', // Thunderbird Commercial (disco Style) (1978)
    'OldCarCommercialsFromThe80s', // Old Car Commercials From The 80s
    '80s-commercials-1986480p_202303', // Fox 1986 Commercial Collection 2 (1986)
    'those-funky-70s', // Those Funky '70s - Compilation Album (1990) TV Commercial (1990)
    'brief1980scommercialbreak', // Brief 1980s Commercial Break
    'yt-5s.com-90s-commercials-1995-480p_20221019', // Winter 1995 Fox Kids Commercial Collection (1995)
    'yt-5s.com-90s-commercials-1995-480p_20221003', // 1995 Fox Kids Commercial Collection (1995)
    '000713_202006', // Old Microsoft Mouse Commercial
    'clear-and-present-danger-advert', // Clear and Present Danger Advert (1994)
    ],

    channels: {
        // Ad Break: whole recorded commercial breaks, 1948-1999.
        4: {
            min: 8,
            max: 26 * 60,
            sources: [
                { series: null, ids: [
                    { seq: ['ClassicT1948', 'ClassicT1948_2', 'ClassicT1948_3', 'ClassicT1948_4', 'ClassicT1948_5', 'ClassicT1948_6', 'ClassicT1948_7', 'ClassicT1948_8'] }, // Prelinger's Classic Television Commercials, in order
                    'Televisi1960', // Television Commercials (1950s-1960s)
                    'Univac_Commercial_Classic_Old_Vintage', // Classic TV Commercial for a UNIVAC computer (1956)
                    'Collectionof90sCommercials', // Collection of 90s Commercials
                    'COMMERCIALS0116', // Mid-'60s TV commercials and promos
                    '1967DogdeDartTvCommercialPamAustinClips', // 1967 Dogde Dart TV commercial ad & Pam Austin clips
                    '60sTvCommercials-ToysG.iJoeEtc', // 60s TV Commercials - toys, G.I Joe, etc.
                    'TwilightZoneSponsorIdsAndBumpers', // Twilight Zone Sponsor ID's and Bumpers
                    '60sTelevisionCommercials1965-66Adspart1', // 60s Television Commercials 1965-66 ads (part 1)
                    '60sTelevisionCommercials1965-66Adspart3', // 60s Television Commercials 1965-66 ads (part 3)
                    'TvCommercialsSupermanBatmanJamesBond60sAds', // 60s Television Commercials: Superman, Batman, James Bond, TV ads
                    'UNIVAC-Computer-Commercials_3D', // UNIVAC Computer Commercials in 3D
                    '60sTelevisionCommercials1965-66part2', // 60s Television Commercials 1965-66 (part 2)
                    'GILBERT1963TOYPROMO', // GILBERT 1963 TOY PROMO
                    'img2979', // Playhouse disney higgleytown heros 2008 with commercials pt2
                    'ILoveLucyWestinghouseCommercials', // I Love Lucy Westinghouse Commercials
                    'ClassicCommercialsS-y', // Classic Commercials S-Y
                    'videoplayback5_201911', // Disney channel new adventures of whinney the pooh commercials 2005
                    'cartoon-planet-2012-bumpers', // Cartoon Planet (2012) Bumpers & Promos
                    'BionicleTrilogyBonusAdvertsRIP', // Lossless Bionicle Movies/DVDs Bonus/Commercials RIP !
                    'ClassicCommercialForCocaCola1953', // Classic Commercials
                    'videoplayback1_20191231', // Disney channel commercials late 2005
                    '7252002CartoonNetworkCommercialspart1Of5', // 7/25/2002 Cartoon Network commercials (part 1 of 5)
                    '1992-uan-2', // More 1992 USA Up All Night Bumpers/Commercialz #tuneintrashout (1992)
                    'AutoliteCommercialsFromsuspense', // Autolite Commercials from
                    'nickelodeon-commercials-may-3-1999480p', // Nickelodeon May 1999 Commercial Collection (1999)
                    'edwoodtvads', // Television Commercial directed by Edward D. Wood Jr.
                    '1981-commercial-breaks', // 1981 Commercial Breaks - 80s TV commercials (1981)
                    'SCIFITOYPROMOS', // SCI FI TOY PROMOS
                    '90s-commercials-1997480p', // USA Network 1997 Commercial Collection (1997)
                    'Q13FoxKidsCommercialsFebruary221997', // February 1997 Fox Kids Commercial Collection (1997)
                    'K-telCommercials', // K-Tel Commercials
                    'vh1commercialsapril1997', // VH1 Commercials ( April 1997) (1997)
                    'SizzlerPromotionalCommercial1991-E3YGtQ40Qvs', // Sizzler Promotional Commercial 1991 (1991)
                    'yt-5s.com-90s-commercials-1998-480p_202210', // October 1998 CBS Commercials Collection (1998)
                    'abcearly1970scommercials', // ABC Early 1970s Commercials
                    'nickelodeon98_s', // Nickelodeon cousin skeeter toy story and commercials 1998
                    'yt-5s.com-90s-commercials-1999-480p_20221023', // Kids WB Summer 1999 Commercial Collection (1999)
                    '48wkbscommercialsmayjune1983', // 48 WKBS Commercials (May-June 1983) (1983)
                    'classic-car-commercial-bmw-isetta', // Classic Car Commercials
                    'outer-limits-kyw-3-commercials', // Outer Limits Kyw 3 Commercials tape (1995)
                    'yt-5s.com-90s-commercials-1998-480p_20221001', // Kids WB December 1998 Commercial Collection 3 (1998)
                    '90s-commercials-1994480p-1_202303', // Fox March 1994 Commercial Collection (1994)
                    'usa-network-commercials-november-24-1996480p', // USA Network November 1996 Commercial Collection (1996)
                    '1969-southwestern-bell-ads-wmbtopcitbwtntali', // 1969 Southwestern Bell Ads WMBTOPCITBWTNTALI (1969)
                    'PalmoliveShavingCream', // Palmolive Shaving Cream Commercials (1953)
                    'cartoon-network-commercial-breaks-8-25-2008', // Cartoon Network Commercial Breaks(8/25/2008)
                    '90s-commercials-1994480p', // Fox September 1994 Commercial Collection (1994)
                    'EarlyK-telCommercials', // Early K-Tel Commercials
                    '35-mm-advert-compilation', // 35MM Cinema Advert Compilation (1970s & 1980s)
                    'yt-5s.com-90s-commercials-1999-480p_20221026', // Kids WB April 1999 Commercial Collection 7 (1999)
                    'the-outer-limits-tape-1-commercials_202211', // Commercials from an Outer Limits VHS broadcast recording (1996)
                    'yt-5s.com-90s-commercials-1999-480p_20221018', // Kids WB April 1999 Commercial Collection 3 (1999)
                    '1987-nbc-commercials', // 1987 McDonalds Commercials & More (1987)
                    'vhs-tape-parent-trap-commercials', // Commercials from VHS tape labelled Parent Trap (1990)
                    'earnest-movies-wb-17-commercials-3', // WB17 PHL October 1997 Commercials (1997)
                    'hbo-1987-bumperz', // HBO 1987 Bumperz (1987)
                    'yt-5s.com-90s-commercials-1995-480p_20221005', // October 1995 Fox Commercial Collection 4 (1995)
                    'greatscoutcathouse-ads-1982', // Channel Seven - ad breaks etc. from "The Great Scout & Cathouse Thursd (1982)
                    'yt-5s.com-90s-commercials-1998-480p', // Kids WB December 1998 Commercial Collection (1998)
                    'channelten-superman-ads-198302', // Channel Ten - ad breaks etc. from "Superman - Part 1" (02/1983) (1983)
                    'secret-place-promo-1', // 1994 VHS tape commercials- from Secret Place, Miami Blues, and Some Ki (1994)
                    'OldCarCommercialsFromThe80s', // Old Car Commercials From The 80s
                    '80s-commercials-1986480p_202303', // Fox 1986 Commercial Collection 2 (1986)
                    'yt-5s.com-90s-commercials-1995-480p_20221003', // 1995 Fox Kids Commercial Collection (1995)
                    'losttoycommercials195060sondvdattvdays', // LOST TOY COMMERCIALS 1950-60's
                    '80s-commercials-nbc-july-1989-720p', // NBC July 1989 Commercial Collection (1989)
                ] },
            ],
        },

        // Cartoon Carnival: Fleischer, Famous, Van Beuren, Terrytoons.
        5: {
            sources: [
            {
                series: null,
                ids: [
                    'popeye_patriotic_popeye', // Patriotic Popeye (1957)
                    'popeye_private_eye_popeye', // Private Eye Popeye (1954)
                    'popeye_shuteye_popeye', // Shuteye Popeye (1952)
                    'popeye_i_dont_scare', // Popeye: I Don't Scare (1956)
                    'the_big_bad_wolf', // The Big Bad Wolf
                    'FLIP_FROG-FIDDLESTICKS', // Flip The Frog - Fiddlesticks (1930)
                    'woody_woodpecker_pantry_panic', // Woody Woodpecker in Pantry Panic (1941)
                    'popeye_taxi-turvey', // Popeye: Taxi-Turvy (1954)
                    'bb_snow_white', // Betty Boop: Snow White (1933)
                    'bb_minnie_the_moocher', // Betty Boop: Minnie The Moocher (1932)
                    'popeye_fright_to_the_finish', // Popeye: Fright To The Finish (1954)
                    'popeye_the_sailor_ancient_fantasy', // Popeye The Sailor Man: Ancient Fistory (1952)
                    'popeye_big_bad_sinbad', // Popeye The Sailor: Big Bad Sinbad (1952)
                    'superman_the_mechanical_monsters', // Superman: The Mechanical Monsters (1941)
                    'mighty_mouse_wolf_wolf', // Mighty Mouse: Wolf! Wolf!
                    'superman_electric_earthquake', // Superman: Electric Earthquake (1942)
                    'the_cobweb_hotel', // The Cobweb Hotel (1936)
                    'mother_goose_little_miss_muffet', // Mother Goose: Little Miss Muffet
                    'bb_and_grampy', // Betty Boop And Grampy (1935)
                    'RudolphTheRed-nosedReindeer1948', // Rudolph The Red-Nosed Reindeer (1948)
                    'SantasSuprise', // Santa's Surprise (1947)
                    'gabby_alls_well', // Gabby: All's Well (1941)
                    'JackFrost_', // Jack Frost (1934)
                    'hectors_hectic_life', // Hector's Hectic Life (1948)
                    'bb_rise_to_fame', // Betty Boop's Rise To Fame (1934)
                    'bb_and_the_little_king', // Betty Boop And The Little King (1936)
                    'noveltoon_naughty_but_nice', // Noveltoon: Naughty But Mice (1947)
                    'noveltoon_the_stupidstitious_cat', // Noveltoon: The Stupidstitious Cat (1946)
                    'bb_be_human', // Betty Boop: Be Human (1936)
                    'bb_big_boss', // Betty Boop's Big Boss (1933)
                    'the_talking_magpies', // The Talking Magpies (1946)
                    'Betty_Boop_for_President_1932', // Betty Boop for President (1932)
                    'bb_betty_in_blunderland', // Betty Boop: Betty in Blunderland (1933)
                    'bb_old_man_of_the_mountain', // Betty Boop: The Old Man Of The Mountain (1933)
                    'bb_chess_nuts', // Betty Boop: Chess Nuts (1932)
                    'little_audry_goofy_goofy_gander', // Little Audry: Goofy Goofy Gander (1950)
                    'bb_stop_that_noise', // Betty Boop: Stop That Noise (1935)
                    'bb_musical_mountaineers', // Betty Boop: Musical Mountaineers (1939)
                    'TheLionTamer_645', // The Lion Tamer
                    'bb_house_cleaning_blues', // Betty Boop: House Cleaning Blues (1937)
                    'Betty_Boop_a_Language_All_My_Own_1935', // Betty Boop: A Language All My Own (1935)
                    'Betty_Boop_Training_Pigeons_1936', // Betty Boop: Training Pigeons (1936)
                    'Betty_Boop_Judge_For_a_Day_1935', // Betty Boop: Judge For a Day (1935)
                    'Betty_Boop_and_Little_Jimmy_1936', // Betty Boop and Little Jimmy (1936)
                    'little_lulu_bargain_counter_attack', // Little Lulu: Bargain Counter Attack (1946)
                    'Betty_Boops_Crazy_Inventions_1933', // Betty Boop's Crazy Inventions (1933)
                    'bb_not_now', // Betty Boop: Not Now (1935)
                    'bb_parade_of_the_wooden_soldiers', // Betty Boop: Parade of the Wooden Soldiers (1933)
                    'bb_swat_the_fly', // Betty Boop: Swat The Fly (1935)
                    'YheAirRace', // The Air Race
                    'bb_morning_noon_and_night', // Betty Boop: Morning, Noon And Night (1933)
                    'Betty_Boop_A_Song_a_Day_1936', // Betty Boop: A Song A Day (1936)
                    'bb_she_wronged_him_right', // Betty Boop: She Wronged Him Right (1934)
                    'bb_the_impractical_joker', // Betty Boop: The Impractical Joker (1937)
                    'Betty_Boop_Whoops_Im_a_Cowboy_1937', // Betty Boop: Whoops! I'm a Cowboy (1937)
                    'Betty_Boop_Baby_Be_Good_1935', // Betty Boop: Baby Be Good (1935)
                    'Betty_Boop_The_Scared_Crows_1939', // Betty Boop: The Scared Crows (1939)
                    'Betty_Boop_with_Henry_1935', // Betty Boop with Henry, the Funniest Living American (1935)
                    'Betty_Boop_Mother_Goose_Land_1933', // Betty Boop: Mother Goose Land (1933)
                    'Betty_Boops_Ker_Choo_1932', // Betty Boop's Ker-Choo (1932)
                    'Betty_Boop_Is_My_Palm_Read_1932', // Betty Boop: Is My Palm Read (1932)
                    'Betty_Boop_More_Pep_1936', // Betty Boop: More Pep (1936)
                    'Popeye_forPresident', // Popeye for President (1956)
                    'spree_lunch', // Spree Lunch (1957)
                    'Popeye_Nearlyweds', // Popeye the Sailor: Nearlyweds (1956)
                    'Popeye_Cooking_With_Gags_1954', // Popeye: Cooking With Gags (1954)
                    'Popeye_Assault_and_Flattery_1956', // Popeye: Assault and Flattery (1956)
                    'Popeye_Parlez_Vous_Woo_1956', // Popeye: Parlez Vous Woo (1956)
                    'JerkyTurkey1945', // Jerky Turkey (1945)
                    'PopeyeAliBaba', // Popeye the Sailor Meets Ali Baba's Forty Thieves (1937)
                    'haul_in_one', // Haul in One, A (1956)
                    'little_sweepea', // Little Swee' Pea (1936)
                    'insect_to_injury', // Insect to Injury (1956)
                    'Popeye_Floor_Flusher_1954', // Popeye: Floor Flusher (1953)
                    'Popeye_Greek_Mirthology_1954', // Popeye: Greek Mirthology (1954)
                    'HaveYouGotAnyCastles', // Have You Got Any Castles? (1938)
                    'GoldRushDaze', // Gold Rush Daze
                    'Christmas_Comes_But_Once_A_Year_1936', // Christmas Comes But Once A Year (1936)
                    'TheSnow_man_1940', // The Snow Man (1940)
                    'arctic_giant', // Arctic Giant, The (1942)
                    'Popeye_ThePanelessWindowWasher', // Popeye: The Paneless Window Washer (1937)
                    'SnowFoolin', // Snow Foolin' (1949)
                    'Gertie', // Gertie The Dinosaur (1914)
                    'Felix_BoldKingCole', // Felix the Cat in Bold King Cole (1936)
                    'destruction_inc', // Destruction Inc. (1942)
                    'superman_the_mad_scientist', // Superman: The Mad Scientist (1941)
                    'bulleteers', // Bulleteers, The (1942)
                    'Popeye_BrideandGloom', // Popeye: Bride and Gloom (1954)
                    'TheFriendlyGhost', // The Friendly Ghost (1945)
                    'CameToSupper', // The Wabbit Who Came to Supper (1942)
                    'now_youre_talking_1927', // Now You're Talking (1927)
                    'Baby_Huey_Quack-A-Doodle-Doo_1950', // Baby Huey: Quack-A-Doodle-Doo (1950)
                    'showdown', // Showdown (1942)
                    'mummy_strikes', // Mummy Strikes, The (1943)
                    'Superman_The_Magnetic_Telescope', // Superman The Magnetic Telescope (1942)
                    'Herman_CheeseBurglar', // Cheese Burglar featuring Herman (1946)
                    'HepCatSymphony', // Hep Cat Symphony (1949)
                    'FallenHeir', // Falling Hare (1943)
                    'customers_wanted', // Customers Wanted (1939)
                    'PaulBunyon', // Paul Bunyon
                    'billion_dollar_limited', // Billion Dollar Limited (1942)
                    'AllsFairAtTheFair-1938', // All's Fair At The Fair - 1938
                    'swiss_trick', // Swiss Trick (1931)
                    'FelixTheCat-FelineFollies1919', // Felix the Cat - Feline Follies (1919)
                    'LittleAudreyInbutterscotchAndSoda1948', // Little Audrey In "Butterscotch and Soda" (1948)
                    'GoofyGoatAntics1933', // Goofy Goat Antics (1933)
                    'Felix_NeptuneNonsense', // Felix the Cat in Neptune Nonsense (1936)
                    'superman_terror_on_the_midway', // Superman: Terror on the Midway (1942)
                    'Gabby_Goes_Fishing_1941', // Gabby Goes Fishing (1941)
                    'Gabby_Fire_Cheese_1941', // Gabby: Fire Cheese (1941)
                    'FelixTheCat-FelixRevolts1923', // Felix the Cat - Felix Revolts (1923)
                    'piano_tooners', // Piano Tooners (1932)
                    'Dancing_On_The_Moon_1935', // Dancing On The Moon (1935)
                    'pencilmania', // Pencil Mania (1932)
                    'Little_Audrey_The_Lost_Dream_1949', // Little Audrey: The Lost Dream (1949)
                    'The_Tuba_Tooter_1932', // Tom and Jerry: The Tuba Tooter (1932)
                    'LittleDutchMill1934', // Little Dutch Mill (1934)
                    'The_Sunshine_Makers_1935', // The Sunshine Makers (1935)
                    'ChickenALaKing-1937', // Chicken A La King - 1937
                    'Peeping_Penguins_1937', // Peeping Penguins (1937)
                    'rocketeers', // Rocketeers (1932)
                    'AladdinAndHisWonderfulLamp', // Aladdin and His Wonderful Lamp
                    'TheLittleStranger1936', // The Little Stranger (1936)
                    'superman_underground_world', // Superman: The Underground World (1943)
                    'superman_volcano', // Superman: Volcano
                    'LLBoredOfEducation', // Little Lulu: Bored of Education (1946)
                    'A_Song_Of_The_Birds_1935', // A Song Of The Birds (1935)
                    'FelixTheCat-TheStoneAge1922', // Felix the Cat - The Stone Age (1922)
                    'Play_Safe_1936', // Play Safe (1936)
                    'A_Car-Tune_Portrait_1937', // A Car-Tune Portrait (1937)
                    'EducatedFish-1937', // Educated Fish - 1937
                    'FelixTheCat-FelixInFairyland1923', // Felix the Cat - Felix in Fairyland (1923)
                    'FelixTheCat-FelixInHollywood1923', // Felix the Cat - Felix in Hollywood (1923)
                    'Little_Lulu_Cad_And_Caddy_1947', // Little Lulu: Cad and Caddy (1947)
                    'Lets_Sing_with_Popeye_1936', // Let's Sing with Popeye (1934)
                    'PopeyeWithBettyBoop', // Popeye with Betty Boop
                    'FelixTheCat-DoublesForDarwin1923', // Felix the Cat - Doubles for Darwin (1923)
                    'Little_Brown_Jug_1948', // Little Brown Jug (1948)
                    'firemans_life', // Fireman's Life, A (1933)
                    'Boy_Meets_Dog_1938', // Boy Meets Dog (1938)
                    'FelixTheCat-FelixGetsBroadcasted1923', // Felix the Cat - Felix Gets Broadcasted (1923)
                    'LittleLambkins-1940', // Little Lambkins - 1940
                    'ThePlayfulPolarBears-1938', // The Playful Polar Bears - 1938
                    'FelixTheCat-FelixTheGhostBreaker1923', // Felix the Cat - Felix the Ghost Breaker (1923)
                    'Westward_Whoa_1926', // Mutt & Jeff: Westward Whoa! (1926)
                    'FelixTheCat-FelixTurnsTheTide1922', // Felix the Cat - Felix Turns the Tide (1922)
                    'FelixAprilMaze', // Felix The Cat - April Maze (1930)
                    'FoxPop', // Fox Pop
                    'Red_Riding_Hood_1931', // Red Riding Hood (1931)
                    'FelixTheCat-FelixGoesA-huntin1923', // Felix the Cat - Felix Goes A-Huntin (1923)
                    'FelixTheCat-FelixMindsTheKid1922', // Felix the Cat - Felix Minds the Kid (1922)
                    'SmallFry-1939', // Small Fry - 1939
                    'PopeyeTheSailorMeetsSindbadTheSailor', // Popeye The Sailor Meets Sindbad The Sailor
                    'Toby_The_Pup_In_The_Museum_1930', // Toby The Pup: In The Museum (1930)
                    'Toonerville_Trolley_Trolley_Ahoy_1936', // Toonerville Trolley: Trolley Ahoy (1936)
                    'Humorous_Phases_of_Funny_Faces_1906', // Humorous Phases of Funny Faces (1906)
                    'tramp_tramp_tramp_1926', // Tramp, Tramp, Tramp (1924)
                    'FelixTheCat-FelixLendsAHand1922', // Felix the Cat - Felix Lends a Hand (1922)
                    'BuzzyBoop1938', // Buzzy Boop (1938)
                    'FELIXTHECATFELIXFINDSOUT', // Felix Finds Out (1924)
                    'FelixTheCat-FelixSavesTheDay1922', // Felix the Cat - Felix Saves the Day (1922)
                    'GoopyGeer1932HughHarmanRudolfIsing', // Goopy Geer 1932 Hugh Harman, Rudolf Ising (1932)
                ],
            }
            ],
        },

        // Slapstick: Keystone, Essanay, Mutual and Hal Roach shorts, all before 1931.
        6: {
            sources: [
            {
                series: null,
                ids: [
                    'THEPALEFACE1922BusterKeaton', // THE PALEFACE ( 1922) Buster Keaton
                    'CopsbusterKeaton', // Cops (Buster Keaton)
                    'ConeyIsland1917', // CONEY ISLAND (1917) -- Roscoe Arbuckle, Buster Keaton, Al St. John
                    'THETRAMP1915CharlieChaplinEdnaPurviance', // THE TRAMP ( 1915) Charlie Chaplin, Edna Purviance
                    'THECHAMPION1915CharlieChaplinEdnaPurviance', // THE CHAMPION ( 1915) Charlie Chaplin, Edna Purviance
                    'TwoTars', // Two Tars Laurel And Hardy Thelma Hill (1928)
                    'ONEWEEK1920BusterKeaton', // ONE WEEK ( 1920) Buster Keaton
                    'liberty1929', // Laurel and Hardy - Liberty ( 1929) (1929)
                    'CharlieChaplinThePawnshopFullMovieHD1916', // The Pawnshop (1916) Charlie Chaplin
                    'BusterKeatonTheElectricHouse', // Buster Keaton The Electric House (1923)
                    'EasyStreet1917_201708', // Easy Street, 1917, Charles Chaplin (1917)
                    'CharlieChaplinInCharlieShanghaiedAppleTV', // Charlie Chaplin In Charlie Shanghaied
                    'chaplin_136', // Charles Chaplin - Mabel at the Wheel
                    'CharlieChaplinTheImmigrant1917HD_201808', // The Immigrant (1917) Charlie Chaplin (1917)
                    'charlie-chaplin-mabels-married-life-1914', // Charlie Chaplin Mabel's Married Life ( 1914)
                    '191920HaroldLloydHauntedSpooksXvid', // 19 1920 Harold Lloyd Haunted Spooks Xvid
                    'THEFACEONTHEBARROOMFLOOR1914CharlieChaplin', // THE FACE ON THE BARROOM FLOOR ( 1914) Charlie Chaplin
                    'ManyMammas', // Too Many Mammas Charley Chase Olive Borden (1924)
                    'TheDaredevil1923--BenTurpin', // THE DAREDEVIL (1923) -- Ben Turpin
                    'TheHauntedHouse1921BUSTERKEATONEdwardF.Cline', // The Haunted House ( 1921) BUSTER KEATON Edward F. Cline (1921)
                    'GoodNightNurse1918', // GOOD NIGHT, NURSE! (1918) -- Roscoe Arbuckle, Buster Keaton, Al St. Jo
                    'OutWest1918', // OUT WEST (1918) -- Roscoe Arbuckle, Buster Keaton, Al St. John
                    'TenDollarsOrTenDays1924--BenTurpin', // TEN DOLLARS OR TEN DAYS (1924) -- Ben Turpin
                    '1917TheButcherBoyBusterKeatonFattyArbucke', // The Butcher Boy (1917) Buster Keaton, Fatty Arbuckle (1917)
                    'BackStage1919', // BACK STAGE (1919) -- Roscoe Arbuckle, Buster Keaton, Al St. John
                    'LaughingGas1914', // Laughing Gas (1914) Charlie Chaplin (1914)
                    'THELOVENESTBusterKeaton', // THE LOVE NEST Buster Keaton (1923)
                    '76654TheTwentyCentLimitedBurnIn', // THE IRON MULE 1925 SILENT MOVIE w/ FATTY ARBUCKLE 76654
                    '1920Convict13BusterKeaton_201804', // Convict 13 (1920) Buster Keaton
                    'charlie-chaplin-the-star-boarder-1914', // Charlie Chaplin-The Star Boarder (1914)
                    'CharlieChaplinTheKnockout1914FunnyMovie', // The Knockout (1914) Charlie Chaplin (1914)
                    'dailymotion-x1hbj2', // Charlie Chaplin - Between Showers (1914) (1914)
                    'TheBellBoy1918', // The Bell Boy (1918) Fatty Arbuckle (1918)
                    'Love1919FattyArbuckle', // Love (1919) Fatty Arbuckle (1919)
                    'chaplin_268', // Charles Chaplin - 1914-10-26 Dough And Dynamite
                    'FattysTintypeTangle1915FattyArbuckle', // Fatty's Tintype Tangle (1915) Fatty Arbuckle (1915)
                    '1917HisWeddingNightBusterKeaton', // 1917 His Wedding Night Buster Keaton (1917)
                    'dailymotion-x8hod6', // Buster Keaton 1-Daydreams (1922)
                    'AMONGTHOSEPRESENTHaroldLloydAHalRoachComedy', // AMONG THOSE PRESENT Harold Lloyd A Hal Roach Comedy (1922)
                    'THEEYESHAVEIT1928BenTurpin', // THE EYES HAVE IT ( 1928) Ben Turpin
                    '1919HaroldLloydNextAisleOver', // 1919 Harold Lloyd Next Aisle Over
                    'DontParkHere1920CharleyChase', // Don't Park Here ( 1920, Charley Chase) (1920)
                    'ARecklessRomeoFattyArbuckle1917', // A Reckless Romeo (1917) Fatty Arbuckle (1917)
                    'ShouldHusbands', // Should Husbands Be Watched Charley Chase Olive Borden (1925)
                    'ACLEVERDUMMYBenTurpin', // A CLEVER DUMMY Ben Turpin (1917)
                    'dailymotion-xfr3r4', // Harold Lloyd: Bumping into Broadway (1919)
                    'shoulder-arms-1918-charlie-chaplin-short', // Shoulder Arms (1918) Charlie Chaplin (1918)
                    'TheProdigalBridegroom', // The Prodigal Bridegroom Ben Turpin Thelma Hill (1926)
                    'his-new-job-1915-directed-by-charlie-chaplin', // His New Job (1915) Directed By Charlie Chaplin (1915)
                    'BRIGHTEYESBenTurpinAMackSennettWarnersComedy', // BRIGHT EYES Ben Turpin A Mack Sennett Warners Comedy (1922)
                    'the-bond-1918-directed-by-charlie-chaplin', // The Bond (1918) Directed By Charlie Chaplin (1918)
                    'chaplin_151', // Charles Chaplin - 1914-05-04 Caugth In A Rain
                    'SittinPrettyWithCharleyChase1924', // Sittin' Pretty With Charley Chase 1924 (1924)
                    'PrideOfPikeville', // The Pride Of Pikeville Ben Turpin Thelma Hill (1927)
                ],
            },
            {
                series: null,
                ids: [
                    { id: 'three-stooges-disorder-in-the-court-blu-ray-restoration', year: 1936 },
                    { id: 'the-three-stooges-sing-a-song-of-six-pants-1947', year: 1947 },
                ],
            }
            ],
        },

        // Rerun Theatre: public-domain episodes of 1950s and 60s television.
        7: {
            sources: [
            {
                series: null,
                ids: [
                    'You_Bet_Your_Life_Groucho', // "You Bet Your Life" With Groucho Marx
                    'Beverly_Hillbillies_Ep13_Home_For_Christmas', // Beverly Hillbillies : Home For Christmas
                    'Beverly_Hillbillies_Ep07_The_Servants', // The Beverly Hillbillies : The Servants
                    'Beverly_Hillbillies_Ep06_Trick_Or_Treat', // The Beverly Hillbillies : Trick Or Treat
                    'SherlockHolmes-TheCaseoftheShyBallerina', // Sherlock Holmes - The Case of the Shy Ballerina (1954)
                    'SherlockHolmes-TheCaseofLadyBeryl', // Sherlock Holmes - The Case of Lady Beryl (1954)
                    'LegionOfOldTimers1949', // ''The Lone Ranger'' - The Legion of Old Timers (1949)
                    'Beverly_Hillbillies_Ep02_Getting_Settled', // Beverly Hillbillies Ep02 Getting Settled
                    'Topper-HenriettaSellsTheHouse', // Topper - Henrietta Sells The House (1953)
                    'LoneRanger_916', // Lone Ranger
                    'OldJoeSister', // ''The Lone Ranger'' - Old Joe's Sister (1949)
                    'TheAdventuresOfFlashGordon', // The Space Adventures of Flash Gordon (1955)
                    'DragnetTheBigActor', // Dragnet: The Big Actor
                    'OzzieNelsonInLaws', // ''Ozzie and Harriet'' - David's Almost In-Laws (Aired 23 November 1960 (1960)
                    'AnnieOakley-AnnieFindsStrangeTreasure', // Annie Oakley - Annie Finds Strange Treasure
                    'SherlockHolmes-TheCaseoftheBelligerentGhost', // Sherlock Holmes - The Case of the Belligerent Ghost (1954)
                    'AnnieOakley-AnnieTrustsAConvict', // Annie Oakley - Annie Trusts a Convict
                    'SherlockHolmes-TheCaseOfHarryCrocker', // Sherlock Holmes - The Case of Harry Crocker
                    'SherlockHolmes-TheCaseoftheTexasCowgirl', // Sherlock Holmes - The Case of the Texas Cowgirl (1954)
                    'SherlockHolmes-TheCaseofthePennsylvaniaGun', // Sherlock Holmes - The Case of the Pennsylvania Gun (1954)
                    'PetticoatJunction', // Petticoat Junction (1964)
                    'Lucy_Show_Main_Street', // "The Lucy Show" - Main Street U.S.A. (1967)
                    'Ozzie_and_Harriet_Christmas', // "The Adventures of Ozzie and Harriet" 1956 Christmas episode
                    'dick_van_dyke_show_34_bank_book_6565696', // The Dick Van Dyke Show #34: Bank Book 6565696 (1962)
                    'DragnetTheBigChildren', // Dragnet: The Big Children
                    'You_Bet_Your_Life_Clock', // ''You Bet Your Life with Groucho Marx'' - Secret Word Clock
                    'SherlockHolmesTheChristmasPudding', // Sherlock Holmes: The Christmas Pudding (1955)
                    'DragnetTheBigLamp', // Dragnet: The Big Lamp
                    'PJ_Spurline', // Petticoat Junction "Spur Line To Shady Rest" (1963)
                    'DragnetTheBigMother', // Dragnet: The Big Mother
                    'Wall_1950s-game-show', // 1950's Television: "You Bet Your Life with Groucho Marx" - Secret Word
                    'jack_benny_03_04_62', // Jack Benny March, 4th 1962 (1962)
                    'OurMissBrooks-HomeCookedMeal', // Our Miss Brooks - Home Cooked Meal (1955)
                    'DragnetTheBigWill', // Dragnet: The Big Will
                    'Jack_Benny_11_04_1951', // The Jack Benny Show from November 04 1951
                    'OneStepBeyondEarthquake', // One Step Beyond : Earthquake ( Season 2, Episode 17) (1960)
                    'TheBeverlyHillbillies-EllyNeedsAMaw-Ep2x12', // The Beverly Hillbillies - Elly Needs a Maw - Ep 2x12
                    'DragnetTheBigWar', // Dragnet: The Big War
                    'DragnetTheBigLease', // Dragnet: The Big Lease
                    'DragnetTheBigWinchester', // Dragnet: The Big Winchester
                    'OZZIE_AND_HARRIET_An_Evening_With_Hamlet', // Ozzie and Harriet : An Evening With Hamlet
                    'OSB-TheBridePossessed', // One Step Beyond - The Bride Possessed
                    'Sherlock_Holmes_TCOT_Laughing_Mummy', // Sherlock Holmes in The Case of the Laughing Mummy (1954)
                    'GrouchoChair', // Groucho Marx in ''You Bet Your Life'' (''Chair'') (Comedy/Game Show) (1954)
                    'Groucho_Marx_Water', // 'You Bet Your Life' - Secret Word: Water
                    'dontyellatyourchildren', // ''Make Room for Daddy'' - Don't Yell at Your Children (1956)
                    'OurMissBrooks-MadisonMascot', // Our Miss Brooks - Madison Mascot (1955)
                    'Kleebob', // Early Television Comedy: ''Burns and Allen" (Episode Title: 'Kleebob C (1950)
                    'OneStepBeyondTheRiddle', // One Step Beyond : The Riddle (1959)
                    'TheBeverlyHillbillies-JedBuysStock-Ep.1x05', // The Beverly Hillbillies - Jed Buys Stock - Ep. 1x05
                    'OneStepBeyondTheDream', // One Step Beyond : The Dream (1959)
                    'Jack_Benny_09_15_1953', // The Jack Benny Show from September 15 1953
                    'DragnetTheBigHate', // Dragnet: The Big Hate
                    'VOICE_YBYL', // 1950's Television: ''You Bet Your Life'' - Secret Word: Voice
                    'DragnetTheBigFraud', // Dragnet: The Big Fraud
                    'Sherlock_Holmes_TCOT_Split_Ticket', // Sherlock Holmes in The Case of the Split Ticket (1954)
                    'OneStepBeyond-AnniversaryOfMurder', // One Step Beyond- Anniversary of Murder
                    'Jack_Benny_04_19_1953', // The Jack Benny Show from April 19 1953
                    'PJ_HootervilleHilton', // Petticoat Junction "A Night at the Hooterville Hilton" (1963)
                    'Ozzie_and_Harriet_Riding_Lesson', // "The Adventures of Ozzie and Harriet" - Rick's Riding Lesson (1958)
                    'OSB-77_The_Last_Round', // One Step Beyond : The Last Round
                    'TheJackBennyProgram-01171954', // The Jack Benny program - 01/17/1954
                    'MakeRoomForDaddy-MargaretsBirthday', // Make Room for Daddy - Margaret's Birthday
                    'TheLoneRanger-CannonballMcKay', // ''The Lone Ranger'' - Cannonball McKay (1949)
                    'DragnetTheBigBarrette', // Dragnet: The Big Barrette
                    'OurMissBrooks-TheBigJump', // Our Miss Brooks - The Big Jump (1955)
                    'SherlockHolmes-TheCaseOfTheNeuroticDetective', // Sherlock Holmes - The Case of the Neurotic Detective
                    'rustygetsahaircut', // ''Make Room for Daddy'' - Rusty Gets a Haircut (1955)
                    'Jack_Benny_10_25_1953', // The Jack Benny Show from October 25 1953
                    'TheAdventuresOfOzzieAndHarriet_119', // The Adventures of Ozzie and Harriet (1964)
                    'SherlockHolmes-TheCaseOfTheDiamondTooth', // Sherlock Holmes - The Case of the Diamond Tooth
                    'PJ_Herbie', // Petticoat Junction "Herbie Gets Drafted" (1963)
                    'Burns_Allen_E68', // Burns and Allen # 68
                    'SherlockHolmes-TheCaseOfTheWinthropLegend', // Sherlock Holmes - The Case of the Winthrop Legend
                    'DragnetTheBigHitRunKiller', // Dragnet- The Big Hit-Run Killer (Season 3, Episode 29) (1954)
                    'youBetYourLife1955-SecretWordFace', // 'You Bet Your Life' (1955) - Secret Word: Face
                    'S2E7THEOPENWINDOW_201804', // One Step Beyond S2 E7 THE OPEN WINDOW
                    'RacketSquadTheSaltedMine1951', // Racket Squad The Salted Mine (1951)
                    'S1E3EMERGENCYONLY', // One Step Beyond S1 E3 EMERGENCY ONLY
                    'SherlockHolmes-TheCaseOfTheTyrantsDaughter', // Sherlock Holmes - The Case of the Tyrant's Daughter
                    'OZZIEANDHARRIETMISC03', // Ozzie and Harriet misc 03
                    'OneStepBeyond_EstherandEmily', // One Step Beyond: Esther and Emily
                    'RacketSquadTheCaseOfTheTwoLittleCountryGirls', // Racket Squad: The Case of the Two Little Country Girls
                    'DragnetTheBigNewYear', // Dragnet: The Big New Year
                    'DragnetTheBigPresent', // Dragnet: The Big Present
                    'RacketSquadKiteHigh', // Racket Squad: Kite High
                    'OzzieBox', // ''The Adventures of Ozzie and Harriet'' (Episode Title: ''Little Black (1959)
                    'TheJackBennyProgram3april1955', // The Jack Benny Program (3/April/1955)
                    'S1E8PREMONITION', // One Step Beyond S1 E8 PREMONITION
                    'SherlockHolmes-TheCaseOfTheRedHeadedLeague', // Sherlock Holmes - The Case of the Red Headed League
                    'OzzieBridge', // Classic TV: ''Ozzie and Harriet'' (Episode Aired 4 June 1958) (1958)
                    'Jack_Benny_01_17_1954', // The Jack Benny Show from January 17 1954
                    'S3E28THEAVENGERS', // One Step Beyond S3 E28 THE AVENGERS
                    'S3E18THESACREDMUSHROOM_201804', // One Step Beyond S3 E18 THE SACRED MUSHROOM
                    'S2E5NIGHTOFTHEKILL', // One Step Beyond S2 E5 NIGHT OF THE KILL
                    'youBetYourLife1956-SecretWordDoor', // 'You Bet Your Life' (1956) - Secret Word: Door
                    'S1E2NightOfApril14', // One Step Beyond S1 E2 Night Of April 14
                    'RacketSquadTheBillOfSaleRacket', // Racket Squad: The Bill of Sale Racket
                    'RacketSquadAccidentallyOnPurpose', // Racket Squad: Accidentally on Purpose
                    'S3E4THERETURN', // One Step Beyond S3 E4 THE RETURN
                    'OneStepBeyond_VanishingPointv2', // One Step Beyond: Vanishing Point
                    'RacketSquadAnyoneCanBeASucker', // Racket Squad: Anyone Can Be a Sucker
                    'S3E3DEATHWALTZ', // One Step Beyond S3 E3 DEATH WALTZ
                    'SherlockHolmes-TheCaseOfTheThistleKiller', // Sherlock Holmes - The Case of the Thistle Killer
                    'RacketSquadTheCaseOfTheHearseChaser', // Racket Squad: The Case of the Hearse Chasers
                    'S3E5IFYOUSEESALLY', // One Step Beyond S3 E5 IF YOU SEE SALLY
                    'S3E24THEFACE', // One Step Beyond S3 E24 THE FACE
                    'OneStepBeyondTheMask', // One Step Beyond The Mask
                    'S3E26SIGNALRECEIVED', // One Step Beyond S3 E26 SIGNAL RECEIVED
                    'RacketSquad-TheChristmasCaper', // Racket Squad: The Christmas Caper
                    'RacketSquadTheSystem', // Racket Squad: The System
                    'S3E9THEVOICE', // One Step Beyond S3 E9 THE VOICE
                    'RacketSquad-CheckAndDoubleCheck1952', // Racket Squad - Check and Double Check (1952)
                    'DragnetBigSorrow', // Dragnet: The Big Sorrow (1952)
                    'RacketSquadHisBrothersKeeper', // Racket Squad: His Brother's Keeper
                    'RacketSquadDesperateMoney', // Racket Squad: Desperate Money
                    'Sunday_With_Jack_Benny_-_Western_Town', // The Jack Benny Program : Western Town
                    'S3E10THEPROMISE', // One Step Beyond S3 E10 THE PROMISE
                    'S2E13FATHERIMAGE', // One Step Beyond S2 E13 FATHER IMAGE
                    'S3E19THEGIFT', // One Step Beyond S3 E19 THE GIFT
                    'S3E29THEPRISONER', // One Step Beyond S3 E29 THE PRISONER
                    'S3E22THESTRANGER', // One Step Beyond S3 E22 THE STRANGER
                    'RacketSquadTheKnockOut', // Racket Squad: The Knock Out
                    'S3E14RENDEZVOUS', // One Step Beyond S3 E14 RENDEZVOUS
                    'Sweater1960', // Old Time Television: ''Ozzie and Harriet'' (Episode: ''A Sweater for R (1960)
                    'JackBenny-JackAtTheSupermarket', // Jack Benny - Jack at the Supermarket
                    'S3E25THEROOMUPSTAIRS', // One Step Beyond S3 E25 THE ROOM UPSTAIRS
                    'OzzieHarrietIsApprovedByKingKai', // Classic Television Comedy: ''The Odd Bolt'' - Ozzie and Harriet
                    'RacketSquadSaleValue', // Racket Squad: Sale Value
                    'RacketSquadTheLongShot', // Racket Squad: The Long Shot
                    'S3E30BLOODFLOWER', // One Step Beyond, S3 E30 BLOOD FLOWER
                    'RacketSquadTheCaseOfTheDancingLady', // Racket Squad: The Case of the Dancing Lady
                    'S3E27THECONFESSION', // One Step Beyond S3 E27 THE CONFESSION
                    'S3E32THEVILLA', // One Step Beyond S3 E32 THE VILLA
                    'RacketSquadTheCaseOfTheMatchmaker', // Racket Squad: The Case of the Matchmaker
                    'RacketSquadTheHomeWreckers', // Racket Squad: The Home Wreckers
                    'OzziePajamas', // Classic Television Comedy: ''The Pajama Game'' - Ozzie and Harriet (1956)
                    'SherlockHolmes-TheCaseOfTheUnluckyGambler', // Sherlock Holmes - The Case of the Unlucky Gambler
                    'RacketSquadTheStrangeCaseOfJamesDoyle', // Racket Squad: The Strange Case of James Doyle
                    'RacketSquadTheSoftTouch', // Racket Squad: The Soft Touch
                    'RumbaGracie', // Classic Early Television: ''Burns and Allen'' (Title: Rumba Lessons)
                    'S2E36THELONELYROOM', // One Step Beyond S2 E36 THE LONELY ROOM
                    'GraciePlot', // Classic TV Comedy: ''Burns and Allen'' - (Title: Gracie's Vegetarian P (1951)
                    'S2E30THEPETERHURKOSSTORYPT1', // One Step Beyond S2 E30 THE PETER HURKOS STORY, PT 1
                    'MakeRoomForDaddy-ChildrensGoverness1955', // Make Room For Daddy - Children's Governess (1955)
                    'RacketSquadTheElephantInStockings', // Racket Squad: The Elephant in Stockings
                    'GeorgeParty', // Comedic Early Television: ''Burns and Allen'' (Episode: ''George's Bir
                    'BarkingDog1961', // Classic Sitcom Comedy: ''Ozzie and Harriet'' (''The Barking Dog'', 16 (1961)
                    'Pick_a_Number--Racket_Squad', // Pick a Number (Racket Squad) (1952)
                    'RacketSquadAPlaceForGrandma', // Racket Squad; A Place for Grandma
                    'tinfoil87876745', // ''The Adventures of Ozzie and Harriet'' - A Ball of Tinfoil (1955) (1955)
                    'RacketSquadTheFamilyTree', // Racket Squad: The Family Tree
                    'SherlockHolmes-TheCaseOfTheEiffelTower', // Sherlock Holmes - The Case of the Eiffel Tower
                    's02e03_Grannys_Garden', // The Beverly HIllbillies - Granny's Garden
                    'SherlockHolmes-TheCaseOfTheRoyalMurder', // Sherlock Holmes - The Case of the Royal Murder
                    'BurnsAndAllen-PropertyTaxAssessor', // Burns and Allen - Property Tax Assessor
                    'MakeRoomForDaddy-TheLittleLeague1955', // Make Room For Daddy - The Little League (1955)
                    'Blessed_Expense--Racket_Squad', // Blessed Expense (Racket Squad) (1952)
                    'DragnetTheBigLight', // Dragnet: The Big Light
                    'Sure_Thing--Racket_Squad', // The Sure Thing (Racket Squad) (1953)
                    'GracieGeorgePlusOthers', // ''Burns and Allen'' (Episode title: ''Too Much of the Mortons''?) (Pos (1951)
                    'Babies_for_Sale--Racket_Squad', // Babies for Sale (Racket Squad) (1951)
                    'SherlockHolmes-TheCaseOfTheVanishedDetective', // Sherlock Holmes - The Case of the Vanished Detective
                    'AdventuresOfOzzieAndHarriet-ARoseADay', // Adventures of Ozzie and Harriet - A Rose A Day
                    'Romance_Unlimited--Racket_Squad', // Romance Unlimited (Racket Squad) (1953)
                    'AnnieOakleyTvShow1954', // ANNIE OAKLEY TV SHOW (1954)
                    'Staff_of_Life--Racket_Squad', // Staff of Life (Racket Squad) (1952)
                    'ChristmasShopping_201512', // "The Jack Benny Program" Christmas Shopping Show (1957)
                    'DragnetTheBigTest', // Dragnet: The Big Test (1953)
                    'IncomeTaxMan', // Classic TV Comedy: ''Burns and Allen'' - (Episode Title: The Income Ta (1951)
                ],
            }
            ],
        },

        // Computer Chronicles, and Net Cafe from the same studio.
        8: {
            sources: [
            {
                series: 'Computer Chronicles',
                ids: [
                    'CC517_commodore_64', // Commodore 64
                    'GaryKild', // Gary Kildall Special
                    'CC501_hypercard', // Hypercard
                    'TheMacin1985', // The Macintosh Computer (1985)
                    'Computer1984_4', // Computer Games (1984)
                    'Amigaand1985', // Amiga and Atari (1985)
                    'virtualreali', // Virtual Reality (1992)
                    'CC605_apple_ii_forever', // Apple II Forever
                    'amiga3000', // Amiga 3000 (1988)
                    'UNIX1985', // UNIX (1985)
                    'BillGate99', // Bill Gates Profile (1999)
                    'CC1024_artificial_intelligence', // Artificial Intelligence
                    'DVD1011999', // DVD 101 (1999)
                    'Japanese1985', // Japanese PC's (1985)
                    'LowEndCo1985', // Low End Computers (1985)
                    'SmartTV95', // Smart TV (1995)
                    'CC1301_windows_95', // Windows 95 (1995)
                    'Operatin1984', // Operating Systems (1984)
                    'Programm1984', // Programming (1984)
                    'CC1232_internet', // Internet (1995)
                    'CDROM10.3', // CD-ROM (1993)
                    'Software1985', // Software Piracy (1985)
                    'amiga_2', // The New Amigas (1988)
                    'windows30', // Windows 3.0 (1990)
                    'IBMPerso1987', // IBM Personal System 2 (1987)
                    'MainFram1984', // Mainframes to Minis to Micros (1984)
                    'CC707_desktop_presentation_graphics_1', // Desktop Presentation Graphics - Part One
                    'Decision1984', // Decision Support Systems (1984)
                    'CC707_desktop_presentation_graphics_2', // Desktop Presentation Graphics - Part Two
                    'Computer1984_6', // Computer Graphics (1984)
                    'midimusic', // MIDI Music (1992)
                    'CC1536BROWSERS', // Battle of the Browsers (1997)
                    'amiga_3', // Amiga 2500 (1989)
                    'Computer1984', // Computer Music (1984)
                    'india_2', // High Tech India - Part One (1989)
                    'StorageD1984', // Storage Devices (1984)
                    'CC606_spreadsheet_wars', // Spreadsheet Wars (1988)
                    'Computer1984_5', // Computer Entrepreneurs (1984)
                    'Programm99', // Programming Languages (1999)
                    'Computer1984_2', // Computer Security (1984)
                    'Windows9_2', // Windows 98
                    'MacClone95', // Mac Clones and New O/S (1995)
                    'Computer1985_3', // Computer Networks (1985)
                    'videogames_2', // Video Game Consoles
                    'CC1308_greatest_games', // Greatest Computer Games (1995)
                    'Windows4', // Windows 95 (1994)
                    'desktopvideo', // Desktop Video 1990 (1990)
                    'Intel3861987', // Intel 386 - The Fast Lane (1987)
                    'ModemsBu1985', // Modems & Bulletin Boards (1985)
                    'Computer1984_3', // Computer Ergonomics (1984)
                    'Business1984', // Business Application Software (1984)
                    'CC1238_interactive_music', // Interactive Music
                    'VisualPr', // Visual Programming Languages (1993)
                    'os2_2', // OS/2 (1993)
                    'Robots1999', // Robots (1999)
                    'Robotics1984', // Robotics (1984)
                    'indiansoftwa', // High Tech India - Part Two (1989)
                    'Lasersan1985', // Lasers and Computers (1985)
                    'episode_1134', // The Internet (1993)
                    'cdroms', // CD ROMs
                    'SuperCom1987', // SuperComuputers (1987)
                    'windowsapps', // Windows Apps
                    'ces_2', // CES 1991 (1991)
                    'CC524_add-on_boards', // Add-on Boards
                    'Astronom1986', // Astronomy Software (1986)
                    'WindowsE_2', // Windows Enhancements - Hardware (1992)
                    'FifthGen1984', // Fifth Generation Computers (1984)
                    '3DGraphi', // 3D Graphics
                    'atarist', // Atari St (1989)
                    'On-LineD1987', // On-Line Services - Part One (1987)
                    'RISC1986', // RISC (1986)
                    'shareware', // Shareware (1988)
                    'Robots-J1985', // Robots - Japanese Style (1985)
                    'CC704_new_laptops', // New Laptops
                    'Macupdat98', // Mac Update (1998)
                    'CyberDat', // Cyber Dating
                    'CC-CES1994-Episode1123', // CES 1994 (1994)
                    'DigitalH1999', // Digital Home Movies (1999)
                    'OS2Warp', // OS/2 Warp
                    'CC434_asian_clones', // Asian Clones (1987)
                    'DigitalJ', // Digital Journalism (1993)
                    'ComputerChronicles-SearchEngines_861', // Computer Chronicles - Search Engines (1996)
                    'Integrat1984', // Integrated Software (1984)
                    'SpeechSy1984', // Speech Synthesis (1984)
                    'CC126_supercomputers', // Super Computers
                    'Microchi1984', // Microchip Technology (1984)
                    'WordProc1984', // Word Processing Software (1984)
                    'PowerPC10.1', // Power PC & PowerMac (1994)
                    'Homedesi98', // Home Design Software
                    'CC526_personal_cad', // Personal CAD
                    'Networki1984', // Networking (1984)
                    'Database1984', // Database Software (1984)
                    'HardDisk1985', // Hard Disk Storage (1985)
                    'TheNewMa1987', // The New Macs (1987)
                    'Storages98', // Data Storage Solutions
                    'homepcs', // Home PCs 1990 (1990)
                    'WindowsN', // Windows NT (1993)
                    'comdex_2', // Comdex 1987
                    'IBMClone1985', // IBM Clones (1985)
                    'MacClone', // Mac Clones (1995)
                    'Printers1984', // Printers (1984)
                    'JAVATool', // JAVA Tools
                    'Consumer1999', // Consumer Buying Guide 1999 (1999)
                    'Christma1985', // Christmas Buyers Guide 1985 (1985)
                    'Simulati1984', // Simulator Software (1984)
                    'CC1331_new_pcs', // New PCs - 1996
                    'frenchtech1', // High Tech France - Part One
                    'neuralnetwor', // Neural Networks
                    'Gaming1999', // Computer Games (1999)
                    'Computer1985_10', // Computer Graphics (1985)
                    'episode_921', // Tandy / Radio Shack Computers (1991)
                    'BestofCO1999', // Best of COMDEX 1999 (1999)
                    'CC518_multitasking', // Multitasking
                    'Computer1985_9', // Computers in Communications (1985)
                    'CyberMus', // Cyber Music
                    'Electron1986', // Electronic Mail (1986)
                    'CC601_macworld', // MacWorld Boston 1988
                    'Computer1987', // Computers and the Arts (1987)
                    'buyersguide_2', // Consumer Buyers Guide 1988 (1988)
                    'palmtops', // Handheld Computers
                    'Slowdown1985_2', // Slowdown in Silicon Valley #2 (1985)
                    'education_2', // Computers in Education (1984)
                    'Business1987_3', // Business Applications Part 3 (1987)
                    'DesktopP1986', // Desktop Publishing #1 (1986)
                    'flightsimula', // Flight Simulators (1990)
                    'Portable1987', // Portable Computers (1987)
                    'hypercard_2', // Hypercard (1990)
                    'CC1218_greatest_games', // Greatest Computer Games
                    'Christma1986', // Christmas Buyers Guide 1986 (1986)
                    'connectivity_2', // Connectivity
                    'episode_1023', // Consumer Electronics Show 1993
                    'intel486', // Intel 486
                    'compbowl1', // Computer Bowl II Part 1 (1990)
                    'NewMacs', // The New Macs
                    'E3Specia', // E3 1996
                    'space_2', // Computers in Space (1989)
                    'Educatio1986', // Educational Software Part 1 (1986)
                    'Internet_2', // Internet Telephony (1996)
                    'memory_2', // Memory Management
                    'episode_909', // Macintosh System 7.0 (1991)
                    'Profileo1985', // Profile of Big Blue - IBM (1985)
                    'SpeechRe1987', // Speech Recognition and Synthesis (1987)
                    'BestComp98', // Best Online Computer Games (1998)
                    'buswars', // Bus Wars (1988)
                    'CC1634COMDEX', // COMDEX 1998 (1998)
                    'CC1416_internet_tv', // Internet TV
                    'networksecur', // Network Security
                    'CyberSec', // Cyber Security
                    'laptops_2', // Laptops (1989)
                    'CC1421_ces', // CES 1997
                    'episode_946', // Space and Astronomy Software
                    'CyberCaf', // Cyber Cafes
                    'ForeignL', // Foreign Language Software (1994)
                    'SecondHa1986', // Second Hand Computers (1986)
                    'Slowdown1985', // Slowdown in Silicon Valley #1 (1985)
                    'On-LineD1987_2', // On-Line Databases #2 (1987)
                    'CDRom', // CD ROM Software
                    'viruses_2', // Viruses (1989)
                    'MobileCo', // Mobile Computing
                    'Business1987_2', // Business Applications Part 2 (1987)
                    'Utilitie1986', // Utilities (1986)
                    'DOS62', // DOS 6.2
                    'Business1985', // Business Applications (1985)
                    'CC1415_greatest_games', // Greatest Games (1996)
                    'Computer98', // Computer Bowl X - Part 1 (1998)
                    'ComdexSp1986', // Comdex 1986 (1986)
                    'fonts_2', // Font City (1991)
                    'diagnosticso', // Diagnostic Software
                    'DesktopP1987', // Desktop Publishing #2 (1987)
                    'Careersi1986', // Careers in Computing (1986)
                    'filecompress', // File Compression
                    'BestofCo98', // Best of Comdex 1997 (1998)
                    'Computer1985_2', // Computers & the Media (1985)
                    'Electron10.2', // Digital Photography
                    'CC1205_computer_art', // Computer Art
                    'Computer1999', // Computer Crime (1999)
                    'BestofCo', // Best of Comdex 1996
                    'GuidetoM1986', // Guide to Macros (1986)
                    'Computer1985_4', // Computers & Politics 1985 (1985)
                    'WomeninC1985', // Women in Computing (1985)
                    'WebRadio99', // Web Radio (1999)
                    'WinterCE', // CES 1996
                    'hypertext', // Hypertext
                    'buyersguide', // Consumer Buyers Guide 1990 (1990)
                    'NewAgeSp', // New Generation Spreadsheets
                    'OpticalS1985', // Optical Storage Devices (1985)
                    'ComdexSp', // Comdex Special - 1994
                    'MacWorld_2', // MacWorld Boston 1994
                    'computerbowl', // Computer Bowl III Part 1 (1991)
                    'BestofCo99', // Best of Comdex Spring 1999 (1999)
                    'CC706_megahertz_mania', // Megahertz Mania
                    'comdex_3', // Comdex 1988 (1988)
                    'ScreenSa', // Screen Savers & Wallpaper
                    'cdromsw', // CD-ROM Software (1992)
                    'Desktopv98', // Desktop Video 1998 (1998)
                    'PCTroubl', // PC Trouble Shooting
                    'Computer_9', // Computer Bowl VI Part 1 (1994)
                    'Computer1987_3', // Computers and Gambling (1987)
                    'inputdevices', // Input Devices (1990)
                    'WebSiteC', // Building Your Web Site
                    'CC1412_digital_photography', // Digital Photography
                    'Computer1985_5', // Computers & Medicine (1985)
                    'Software99', // Software Secrets
                    'networks1', // Local Area Networks: IBM Compatibles (1987)
                    'compbowl2', // Computer Bowl II Part 2 (1990)
                    'Parallel1986', // Parallel Processing (1986)
                    'CyberPri98', // Cyber Privacy (1998)
                    'Uharddiskman', // U Hard Disk Management (1989)
                    'Business1987_4', // Business Applications Part 4 (1987)
                    'Business1987', // Business Applications Part 1 (1987)
                    'WindowsE', // Windows Enhancement Software
                    'CC1320_winter_ces_1996', // Winter CES 1996
                    'WebPlugI98', // Web Plug-Ins
                    'Wireless_2', // Wireless Computing
                    '1202', // MacWorld Expo Boston 1994 (1994)
                    'episode_1040', // Beginners Guide to PCs (1992)
                    'Cyberfic98', // Cyber Fiction
                    'Photofin', // Digital Photofinishing
                    'episode_602', // Computer Bowl I - Part One (1988)
                    'Computer1985_7', // Computers and the Disabled (1985)
                    'SohoSoft', // Small Business Software (1996)
                    'Personal1985', // Personal Finance Software (1985)
                    'ProjectM1986', // Project Management Software (1986)
                    'OnLineSh', // On Line Shopping
                    'networks2', // Local Area Networks: Apple (1987)
                    'CC1236_computer_bowl', // Computer Bowl VII - 1995 (1995)
                    'writingsoftw', // Writing Software (1989)
                    'Computer1986_3', // Computers & the Pentagon Part Two (1986)
                    'BuyOrUpg', // Buy Or Upgrade?
                    'Computer1987_2', // Computers and Illiteracy (1987)
                    'Y2KYear21999', // Y2K - Year 2000 (1999)
                    { id: 'Year2000', year: 1999 }, // Year 2000 (Y2K) — a 1999 episode; the title is not its date
                ],
            },
            {
                series: 'Net Cafe',
                ids: [
                    'nc103_cyberpolitics', // Politics on the Web
                    'nc101_hackers', // Hackers
                    'nc112_writers', // Cyber Writing
                    'TVshowso98', // TV Shows Online (1998)
                    'nc102_ufos', // UFOs
                    'Conspira1999', // Conspiracy Theories (1999)
                    'OnlineLi1999', // Online Literature (1999)
                    'nc111_movies', // Movies Online
                    'HumorOnT98', // Humor on the Web (1998)
                    'SpaceSci98', // Space Science (1998)
                    'nc117_weird_web', // The Weird Web
                    'ChatRoom00', // Chat Rooms (1998)
                    'nc613_nicholas_negroponte_pt1', // Nicholas Negroponte - Part One
                    'nc216_virtual_doctor', // Virtual Doctors (1997)
                    'WebbyAwa99', // Webby Awards 1999 - Part One
                    'nc102_comics', // Comic Books on the Web
                    'nc615_nicholas_negroponte_pt2', // Nicholas Negroponte - Part Two
                    'nc118_scifi', // Science Fiction Online
                    'nc105_women', // Women on the Web
                    'nc147_virtual_zoo', // The Virtual Zoo
                    'privacyi97', // Privacy in Cyberspace
                    'nc439_new_age_websites', // New Age Web Sites
                    'nc107_weird_science', // Weird Science on the Web
                    'CoolHome98', // Cool Home Pages (1998)
                    'CyberCha98', // Cyber Chat (1998)
                    'nc103_dating_romance', // Love and Romance on the Web
                    'Hollywoo98', // The Hollywood Connection (1998)
                    'Hollywoo1999', // Hollywood on the Net (1999)
                    'Lionsand1999', // Lions and Tigers and Bears (1999)
                    'GlobalNe99', // The Global Net (1998)
                    'CyberNew00', // Cyber News (1998)
                    'JustforF1999', // Fun Web Sites (1999)
                    'CyberCom99', // Cyber Communities (1998)
                    'webradio97', // Web Radio
                    'nc440_online_collecting', // Online Collecting
                    'nc106_games', // Games on the Net
                    'nc231_home_improvement', // Home Improvement (1998)
                    'CyberKid99', // Performing Arts on the Web
                    'nc110_music', // Music Web Sites
                    'nc119_disinformation', // Disinformation on the Web
                    'Moneyont98', // Making Money On Line (1998)
                    'SafeKids2002', // Safe Kids Safe Net (1998)
                    'BestSOHO98', // Small Business Resources On the Net
                    'nc148_online_sports', // Sports Online
                    'Portals98', // Portals (1998)
                    'OnlineSp1997', // Online Sports
                    'Investin1998', // Investing Online (1998)
                    'nc107_vrml3d_worlds', // The 3D Web
                    'JobsandC98', // Jobs and Careers (1998)
                    'CyberSpo99', // Cyber Sports (1998)
                ],
            }
            ],
        },

        // Newsreel: Universal Newsreel, 1929-1967.
        9: {
            sources: [
            {
                series: 'Universal Newsreel',
                ids: [
                    '1958-02-03_First_US_Satellite_Launched', // First U.S. Satellite Launched! 1958/02/03 (1958)
                    '1933-10-11_Farmer_Plays_Tune_With_Hands', // Farmer Plays Tune With Hands, 1933/10/11 (1933)
                    '1963-11-14_Space_Movie', // Space Movie. Camera Records Missile In Flight, 1963/11/14 (1963)
                    '1967-04-18_Peace_March', // Peace March. Thousands Oppose Vietnam War, 1967/04/18 (1967)
                    '1962-08-16_The_Wall', // The Wall, 1962/08/16 (1962)
                    '1959-01-22_Rally_For_Castro', //  (1959)
                    '1964-10-26_Fashions', // Fashions, 1964/10/26 (1964)
                    '1942-02-04_Soldiers_Stage_Girlie_Show', // Soldiers Stage 'Girlie' Show, 1942/02/04 (1942)
                    '1946-07-08_First_Pictures_Atomic_Blast', // First Pictures Atomic Blast!, 1946/07/08 (1946)
                    '1962-10-25_The_Cuban_Crisis', // The Cuban Crisis, 1962/10/25 (1962)
                    '1944-11-22_RAF_Sinks_Tirpitz', // RAF Sinks Tirpitz, 1944/11/22 (1944)
                    '1933-11-15_Loyola_Students_Compete_For_Keg', // Loyola Students Compete For Keg, 1933/11/15 (1933)
                    '1957-04-04_Kansas', // Kansas, 1957/04/04 (1957)
                    '1962-02-22_Space_Triumph', // Space Triumph! Glenn Flight Thrills World, 1962/02/22 (1962)
                    '1957-07-08_Dedication', // Dedication. Warren, Hoover, Hail New Truman Library, 1957/07/08 (1957)
                    '1943-09-09_Long_Way_to_Go_Says_FDR', // Long Way to Go Says FDR, 1943/09/09 (1943)
                    '1949-12-26_1949_In_Review', // 1949 In Review, 1949/12/26 (1949)
                    'UniversalNewsreelVolume35Release201-01-1962', // Universal Newsreel Volume 35, Release 2, 01/01/1962 (1962)
                    '1960-05-23_florida', // Florida, 1960/05/23 (1960)
                    '1967-06-06_Mid-East', // Mid-East. Israeli-Egyptian Battle Erupts, 1967/06/06 (1967)
                    '1960-10-31_Satchmo_Swings_In_Congo', // Satchmo Swings In Congo, 1960/10/31 (1960)
                    'UniversalNewsreelVolume35Release7509-13-1962', // Universal Newsreel Volume 35, Release 75, 09/13/1962 (1962)
                    '1964-03-02_New_York_Worlds_Fair', // New York World's Fair, 1964/03/02 (1964)
                    '1960-05-27_cataclysm', // Cataclysm. Volcano, Tidal Waves, Devastate Pacific Area, 1960/05/27 (1960)
                    '1943-09-30_Mrs_FDR_Tells_One', // Mrs. FDR Tells One, 1943/09/30 (1943)
                    '1945-04-09_Landings_On_Okinawa', // Landings On Okinawa, 1945/04/09 (1945)
                    '1941-12-24_Big_News_of_1941', // Big News of 1941 - The Editors of Universal Newsreel present dramatic (1941)
                    'UniversalNewsreelVolume35Release6007-23-1962', // Universal Newsreel Volume 35, Release 60, 07/23/1962 (1962)
                    '1944-12-07_Allied_Vise_Tightens_On_Rhineland', // Allied Vise Tightens On Rhineland, 1944/12/07 (1944)
                    '1967-05-05_Protests_Galore', // Protests Galore! 1967/05/05 (1967)
                    '200-UN-35-53', // Universal Newsreel Volume 35, Release 53, 06/28/1962 (1962)
                    '1961-08-31_Berlin', // Berlin, 1961/08/31 (1961)
                    'UniversalNewsreelVolume34Issue801-23-1961', // Universal Newsreel Volume 34, Issue 8: 01/23/1961 (1961)
                    '1950-12-21_War_or_Peace', // War or Peace? 1950 Fateful Year, 1950/12/21 (1950)
                    '1948-11-22_Navy_Tests_Twin_Jet_Fighter', // Navy Tests Twin Jet Fighter, 1948/11/22 (1948)
                    '1958-03-17_Brussels_Worlds_Fair', // Brussels World's Fair, 1958/03/17 (1958)
                    '1959-07-27_Havana_Rally', // Havana Rally. Peasants Mass To Support Castro, 1959/07/27 (1959)
                    '1962-10-29_Crisis_Eases', // Crisis Eases. Wary U.S. Awaits Missile Removal, 1962/10/29 (1962)
                    'UniversalNewsreelVolume35Release3905-10-1962', // Universal Newsreel Volume 35, Release 39, 05/10/1962 (1962)
                    '1945-05-08_Germany_Gives_Up', // Germany Gives Up, 1945/05/08 (1945)
                    '1960-07-21_missile_milestone', // Missile Milestone. First Polaris Firing By Submerged U-Boat, 1960/07/2 (1960)
                    '1948-12-09_Cuba_President_in_US', // Cuba President in U.S., 1948/12/09 (1948)
                    '1945-04-05_Air_Army_Invades_Germany', // Air Army Invades Germany, 1945/04/05 (1945)
                    '1948-10-21_Clay_speaks_on_Berlin_Airlift', // Clay speaks on Berlin Airlift,1948/10/21 (1948)
                    '1947-06-05_West_Point_Graduation', // West Point Graduation, 1947/06/05 (1947)
                    '1944-07-18_Liberation_Of_France_Forges_On', // Liberation Of France Forges On, 1944/07/18 (1944)
                    '1960-11-17_Algeria', // Algeria, 1960/11/17 (1960)
                    '1938-10-31_Attack_By_Mars_Panics_Thousands', // Radio Station's 'Attack By Mars' Panics Thousands, 1938/10/31 (1938)
                    '1957-04-08_Spanish_Revolution_Anniversary', // Spanish Revolution Anniversary, 1957/04/08 (1957)
                    '1967-05-02_Expo_67', // Expo 67 'Monument To Man' Opens In Canada (1967)
                    '1948-10-25_Berlin_Airlift_increased', // Berlin Airlift increased, 1948/10/25 (1948)
                    '1944-03-20_Blast_Berlin_By_Daylight', // Blast Berlin By Daylight, 1944/03/20 (1944)
                    '1961-04-19_Cuba_Invaded', // Cuba Invaded. Foes of Castro Open Offensive, 1961/04/19 (1961)
                    '1946-06-10_Allied_Victory_Parade', // Allied Victory Parade, 1946/06/10 (1946)
                    '1957-12-09_Air_Force_Gets_A_New_Theme_Song', // Air Force Gets A New Theme Song, 1957/12/09 (1957)
                    '1962-07-12_A_Day_in_History', // A Day in History. Telstar Brings World Closer, 1962/07/12 (1962)
                    '1945-03-12_Air_Smashes_Devastate_Germany', // Air Smashes Devastate Germany, 1945/03/12 (1945)
                    '1961-10-16_Formosa', // Formosa, 1961/10/16 (1961)
                    '1959-01-05_Castro_Triumphs', // Castro Triumphs. Havana Crowds Hail Success Of Revolt, 1959/01/05 (1959)
                    '1945-02-15_Big_Three_Confer', // Big Three Confer, 1945/02/15 (1945)
                    '1945-07-23_Cruiser_Bow_Ripped_Off_By_Typhoon', // Cruiser Bow Ripped Off By Typhoon, 1945/07/23 (1945)
                    '1933-05-08_President_Speaks_To_The_Nation', // President Speaks To The Nation, 1933/05/08 (1933)
                    '1945-12-10_Christmas_Brings_Joy_To_Everyone', // Christmas Brings Joy To Everyone, 1945/12/10 (1945)
                    '1967-04-04_Seattle', // Seattle, 1967/04/04 (1967)
                    '1960-09-22_25_years_ago', // 25 Years Ago, 1960/09/22 (1960)
                    '1961-01-23_Inauguration', // Inauguration. Kennedy Sworn In, New Era Begins, 1961/01/23 (1961)
                    '1960-12-31_News_Highlights_of_1960', // News Highlights of 1960, 1960/12/31 (1960)
                    '1946-06-20_Japan_Today', // Japan Today, 1946/06/20 (1946)
                    '1964-10-26_Olympics_End', // Olympics End. U.S. Teams Win Medal Honors, 1964/10/26 (1964)
                    '1946-01-21_Churchill_On_Vacation', // Churchill On Vacation, 1946/01/21 (1946)
                    '1932-02-04_Pacific_Armada', // Pacific Armada, 1932/02/04 (1932)
                    '1958-01-30_Baghdad_pact', // Baghdad pact. Unified Military Command Seen, 1958/01/30 (1958)
                    '1960-05-16_summit_crisis', // Summit Crisis. Mr. K. In Ugly Mood Over U-2 Incident , 1960/05/16 (1960)
                    '1933-11-13_Al_Smith_Hails_End_of_Dry_Law', // Al Smith Hails End of Dry Law, 1933/11/13 (1933)
                    '1941-03-06_Big_Da-Dit-Da_Class_Graduated', // Big Da-Dit-Da Class Graduated At New Naval Radio School (exclusive), 1 (1941)
                    '1938-09-19_All_Nations_Shaken_By_War_Crisis', // All Nations Shaken By War Crisis, 1938/09/19 (1938)
                    '1952-08-07_Korea', // Korea See-Saw Battle For 'Baldy' Ridge Rages, 1952/08/07 (1952)
                    '1945-06-11_Victorious_Generals_Welcomed', // Victorious Generals Welcomed, 1945/06/11 (1945)
                    '1959-06-11_X-15_Aloft', // X-15 Aloft. First Free Flight Of Manned Space Plane, 1959/06/11 (1959)
                    '1956-07-30_Suez_Canal_Seized', // Suez Canal Seized By Egyptians, 1956/07/30 (1956)
                    '1945-03-19_Carriers_Hit_Tokyo', // Carriers Hit Tokyo! 1945/03/19 (1945)
                    '1944-06-22_Aviation_In_The_News', // Aviation In The News, 1944/06/22 (1944)
                    '1961-04-19_First_Pictures', // First Pictures. Soviets Hail Space hero , 1961/04/19 (1961)
                    '1946-11-21_White_Sands_NM_V-2_rocket', // White Sands NM V-2 rocket, 1946/11/21 (1946)
                    '1955-08-18_Air_Defenses', // Air Defenses, 1955/08/18 (1955)
                    '1945-05-17_U-Boat_Menace_Ended', // U-Boat Menace Ended, 1945/05/17 (1945)
                    '1941-08-29_Churchill_Homecoming', // Churchill Home-Coming, 1941/08/29 (1941)
                    '1959-01-05_49th_Star_Alaska_Statehood', // 49th Star. Alaska Statehood, New Flag, Official, 1959/01/05 (1959)
                    '1933-03-20_Money_Stream_Flow_From_Treasury', // Money Stream Flow From Treasury 1933/03/20 (1933)
                    '1956-08-20_Republican_Convention', // Republican Convention, 1956/08/20 (1956)
                    '1942-07-13_Allied_Convoy_Battles_Axis', // Allied Convoy Battles Axis, 1942/07/13 (1942)
                    '1959-07-27_Nixon_In_USSR', // Nixon In U.S.S.R. Opening U.S. Fair, Clashes With Mr. K, 1959/07/27 (1959)
                    '1944-04-24_Campaign_in_Burma', // Campaign in Burma, 1944/04/24 (1944)
                    '1943-08-26_Roosevelt_Warns_Axis', // Roosevelt Warns Axis, 1943/08/26 (1943)
                    '1961-08-07_Cosmonaut', // Cosmonaut. Russian Orbits Globe17 Times, 1961/08/07 (1961)
                    '1944-04-03_Jungle_War_In_Burma', // Jungle War In Burma, 1944/04/03 (1944)
                    '1958-06-09_Russian_exhibit_of_Sputnik', // Russian exhibit of Sputnik, 1958/06/09 (1958)
                    '1957-12-09_Satellite_A_Bust', // Satellite A Bust. Rocket Blows Up In First U.S, 1957/12/09 (1957)
                    '1946-06-13_Atom_Test_Nears', // Atom Test Nears, 1946/06/13 (1946)
                    '1941-03-11_Lend-Lease_Bill_Passed', // Lend-Lease Bill Passed, 1941/03/11 (1941)
                    '1964-10-15_US_Dominates_Tokyo_Games', // The Olympics. U.S. Dominates Tokyo Games, 1964/10/15 (1964)
                    '1956-05-21_Armed_Forces_display_US_Might', // Armed Forces display U.S. Might On Observance Day, 1956/05/21 (1956)
                    '1944-05-08_The_Arsenal_For_D-Day', // The Arsenal For D-Day, 1944/05/08 (1944)
                    '1936-05-11_Giant_Dirigible_Sets_Record', // Giant Dirigible Sets Record, 1936/05/11 (1936)
                    '1955-12-19_US_Jet_Planes', // U.S. Jet Planes Go To Airforce of The Netherlands, 1955/12/19 (1955)
                    '1959-06-01_Space_Monkeys', // Space Monkeys Meet Press After Missile Mission, 1959/06/01 (1959)
                    '1944-05-29_Advance_on_Rome', // Advance on Rome, 1944/05/29 (1944)
                    '1958-12-22_Atlas_In_Orbit', // Atlas In Orbit. Radios Ike's Message Of Peace To World, 1958/12/22 (1958)
                    '1946-08-19_President_on_Vacation', // President on Vacation, 1946/08/19 (1946)
                    '1933-11-06_City_Gold_Rush_Starts', // City Gold Rush Starts, 1933/11/06 (1933)
                    '1957-03-07_A_New_Nation', // A New Nation. Gold Coast becomes Ghana In Ceremony, 1957/03/07 (1957)
                    '1959-11-02_Iran', // Iran, 1959/11/02 (1959)
                    '1944-6_Battle_For_Rome', // 1944/02/17, Battle for Rome (1944)
                    '1955-09-05_New_York_City', // New York City, 1955/09/05 (1955)
                    '1967-11-03_Inauguration', // Inauguration. Thieu Sworn In, Stresses Peace, 1967/11/03 (1967)
                    '1944-05-22_War_News_All_Good', // War News--All Good, 1944/05/22 (1944)
                    '1955-07-21_Ikes_Challenge', // Ike's Challenge, 1955/07/21 (1955)
                    '1960-05-19_25_years_ago', // 25 Years Ago, 1960/05/19 (1960)
                    '1945-08-23_Japanese_Surrender', // Japanese Surrender, 1945/08/23 (1945)
                    '1944-06-30_Saipan_Is_Ours', // Saipan Is Ours,1944/06/30 (1944)
                    '1959-03-16_Aloha_Hawaii', // Aloha Hawaii. islanders Celebrate Long-Sought Statehood, 1959/03/16 (1959)
                    '1933-04-24_New_Dirigible_on_Trial_Flights', // New Dirigible on Trial Flights 1933/04/24 (1933)
                    '1936-11-07_Roosevelt_Landslide', // Roosevelt Landslide, 1936/11/07 (1936)
                    '1933-10-25_Primo_Carrera', // Primo Carrera, 1933/10/25 (1933)
                    '1960-05-05_russia', // Russia, 1960/05/05 (1960)
                    '1959-04-30_California', // California, 1959/04/30 (1959)
                    '1946-06-27_Monster_Flying_Wing', // Monster Flying Wing, 1946/06/27 (1946)
                    '1962-09-13_Kennedy_Tour', // Kennedy Tour. Calls For U.S. lead In Space, 1962/09/13 (1962)
                    '1957-07-04_Moon_Is_Born', // 'Moon' Is Born. The Story of 'Project Vanguard', 1957/07/04 (1957)
                    '1941-03-04_Screen_Notables_Hear_Roosevelt', // Screen Notables Hear Roosevelt Praise Industry, 1941/03/04 (1941)
                    '1960-11-10_Kennedy_Elected', // Kennedy Elected, 1960/11/10 (1960)
                    '1957-05-30_Atom_Fallout', // Atom Fallout. New Tests Begin As Safety Debate Rages, 1957/05/30 (1957)
                    '1967-05-02_New_York_City', // Loyalty Day, New York City, 1967/05/02 (1967)
                    '1945-07-05_Final_Days_of_Struggle_in_Okinawa', // Final Days of Struggle in Okinawa, 1945/07/05 (1945)
                    '1946-07-01_Operations_Crossroads_Underway', // Operations Crossroads Underway, 1946/07/01 (1946)
                    '1963-03-18_Suspense_Story', // Suspense Story. Nat'l Press Club Hears Hitchcock, 1963/03/18 (1963)
                    '1960-05-12_triton_submarine_circles_world', // New Magellan. 'Triton' Circles World Submerged, 1960/05/12 (1960)
                    '1934-06-27_President_Reports_To_Nation', // President Reports To Nation On The Progress Of Recovery, 1934/06/27 (1934)
                    '1958-08-21_Triton_Launched', // Triton Launched. Giant Sub First With Twin Nuclear Engines, 1958/08/21 (1958)
                    '1957-11-04_Pennsylvania', // Pennsylvania, 1957/11/04 (1957)
                    '1963-11-18_Space_Tour', // Space Tour. Kennedy Inspects Missile Center, 1963/11/18 (1963)
                    '1959-03-19_Project_Argus', // Project Argus 'Greatest Experiment': 3 A-Blasts In Space, 1959/03/19 (1959)
                    '1959-04-13_At_Sea', // At Sea, 1959/04/13 (1959)
                    '1958-08-11_A-Sub_Epic', // A-Sub Epic. Nautilus Pioneers North Pole Seaway, 1958/08/11 (1958)
                    '1944-06-15_First_Pictures_Of_Romes_Capture', // First Pictures Of Rome's Capture, 1944/06/15 (1944)
                    '1965-05-27_Space_Policeman', // Space Policeman. Pegasus Measures Action Of Meteoroids, 1965/05/27 (1965)
                    '1956-04-09_Arctic_Sentinels', // Arctic Sentinels. Building Rushed on Radar Defense, 1956/04/09 (1956)
                    '1964-10-19_The_Olympics', // The Olympics. U.S. Widens Tokyo Lead, 1964/10/19 (1964)
                    '1944-07-02_Cherbourg_Gateway_to_Victory', // Cherbourg, Gateway to Victory, 1944/07/02 (1944)
                    '1946-02-21_New_Airliner', // New Airliner, 1946/02/21 (1946)
                    '1957-02-14_Tel_Aviv_Israel', // Tel Aviv Israel, 1957-02-14 (1957)
                    '1956-04-12_Full_Scale_War_Looms', // Full Scale War Looms in Middle East , 1956/04/12 (1956)
                    '1956-08-06_Suez_Crisis', // Suez Crisis. British, French Rush Warships to Area, 1956/08/06 (1956)
                    '1938-04-20_World-Wide_News_Events', // World-Wide News Events, 1938/04/20 (1938)
                    '1944-11-27_Target_Tokyo_From_Saipan', // Target Tokyo From Saipan B-29 Base, 1944/11/27 (1944)
                    '1952-06-16_Atom_Sub', // Atom Sub. President Officiates At Laying Of Keel, 1952/06/16 (1952)
                    '1933-11-06_Veterans_Parade_in_Hoboken', // Veterans Parade in Hoboken, NJ, 1933/11/06 (1933)
                    '1938-07-06_World-Wide_News_Events', // World-Wide News Events, 1938/07/06 (1938)
                    '1933-04-24_Akron_Hulk_Salvage', // Akron Hulk Salvage 1933/04/24 (1933)
                    '1945-08-20_Radar_Secrets_Revealed', // Radar Secrets Revealed, 1945/08/20 (1945)
                    '1933-10-18_Cameraman_Risks_Life_in_Sub', // Cameraman Risks Life To Film 'Sub' In Striking Speed Tests, 1933/10/1 (1933)
                    '1933-08-07_Stratosphere_Balloon_Falls', // Stratosphere Balloon Falls, 1933/08/07 (1933)
                    '1944-06-26_The_Battle_of_France', // The Battle of France, 1944/06/26 (1944)
                    '1958-02-06_Navys_Satellite', // Navy's Satellite. Vanguard Fails in Second Launching, 1958/02/06 (1958)
                    '1944-03-13_MacArthur_in_Battle', // MacArthur in Battle, 1944/03/13 (1944)
                    '1962-07-23_First_Lady_At_Play', // First Lady At Play. She Joins Glenn At Water Skiing, 1962/07/23 (1962)
                    '1946-10-21_Navy_Day', // Navy Day! 1946/10/21 (1946)
                    '1935-04-29_FDR_Sees_Fear_Vanishing', // F. D. R. Sees Fear Vanishing, 1935/04/29 (1935)
                    '1940-05-20_FDR_Asks_Billion_For_Defense', // FDR Asks Billion For Nat'l Defense And 50,000 Planes, 1940/05/20 (1940)
                    '1942-06-15_Scrap_Rubber_Needed', // "Scrap Rubber Needed" - F.D.R, 1942/06/15 (1942)
                    '1955-09-01_USS_Forrestal', // U.S.S. Forrestal, 1955/09/01 (1955)
                    'News_Review_of_1958', // News Review of 1958 (1958)
                    '1960-08-04_march_of_events_in_congo_crisis', // March Of Events In Congo Crisis, 1960/08/04 (1960)
                    '1958-03-17_3rd_Vanguard_Successful', // 3rd Vanguard Successful - Moon Launcher, 1958/03/17 (1958)
                    '1933-11-06_Highlights_In_the_News', // Highlights In the News, 1933/11/06 (1933)
                    '1961-03-13_Peace_Corps', // Peace Corps. Kennedy Outlines Global Program, 1961/03/13 (1961)
                    '1960-12-22_Space_Progress', // Space Progress. 'Man-In'Space' Capsule Recovery Successful, 1960/12/2 (1960)
                    '1933-11_Ancient_Chinese_Field_Games', // Ancient Chinese Field Games, ca. 1933 (1933)
                    '1956-11-05_Eisenhower_Re-Elected', // Eisenhower Re-Elected, 1956/11/05 (1956)
                    '1960-10-03_khrushchev_threatens_dag_un', // Khrushchev Threatens Dag & U.N, 1960/10/03 (1960)
                    '1956-02-09_Guided_Missile', // Guided Missile. Navy Tests Newest Atomic War Weapon, 1956/02/09 (1956)
                    '1946-08-23_Navys_Biggest_Airplane', // Navy's Biggest Airplane, 1946/08/23 (1946)
                    '1940-05-15_America_Not_Secure', // America Not Secure Against Brute Force Says Cordell Hull, 1940/05/15 (1940)
                    '1957-10-28_Space_Race', // Space Race. U.S. In Lead With 4.000-Mile Rocket, 1957/10/28 (1957)
                    '1959-03-19_Detroit', // Detroit, 1959/03/19 (1959)
                    '1961-05-08_As_World_Watched', // As World Watched. Spaceman Hailed After U.S. Triumph, 1961/05/08 (1961)
                    '1945-07-16_Jet_Planes_in_Action', // Jet Planes in Action, 1945/07/16 (1945)
                    '1945-02-26_First_Pictures_Manila_Conquest', // First Pictures Manila Conquest, 1945/02/26 (1945)
                    '1960-11-17_Nuclear_Navy', // Nuclear Navy. First Polaris A-Sub Sails On Ocean Patrol, 1960/11/17 (1960)
                    '1956-08-23_Its_Ike_and_Nixon', // It's Ike and Nixon! 1956/08/23 (1956)
                    '1961-01-05_US_Breaks_Relations_With_Cuba', // U.S. Breaks Relations With Cuba, 1961/01/05 (1961)
                    '1964-10-12_Tokyo_Winter_Olympics', // Japan, 1964/10/12 (1964)
                    '1947-01-20_Army-Navy_Agree_On_Merger', // Army-Navy Agree On Merger, 1947/01/20 (1947)
                    '1932-02-22_Mightiest_War_Game', // Mightiest War Game, 1932/02/22 (1932)
                    '1956-11-08_Landslide_for_Eisenhower', // Landslide for Eisenhower, 1956/11/08 (1956)
                    '1933-10-25_Vest_Pocket_Cycle', // Vest Pocket Cycle, 1933/10/25 (1933)
                    '1933-10-25_Carl_Laemmle_Arrives_Home', // Carl Laemmle Arrives Home, 1933/10/25 (1933)
                    '1935-02-11_Roosevelt_Addresses_Boy_Scouts', // Roosevelt Addresses Boy Scouts, 1935/02/11 (1935)
                    '1936-03-18_Gala_Parade_On_St_Patricks_Day', // 40,000 March In Gala Parade On St. Patrick's Day, 1936/03/18 (1936)
                    '1962-07-19_X-15_Space_Record', // X-15 Space Record. Plane Flown To 59-mile Mark, 1962/07/19 (1962)
                    '1945-01-15_MacArthur_Closes_In_On_Manila', // MacArthur Closes In On Manila, 1945/01/15 (1945)
                    '1957-04-08_New_Aerial_Work_Horse', // New Aerial Work Horse Wears Skiis, 1957/04/08 (1957)
                    '1957-02-14_Redstone_Missile', // Redstone Missile In production, 1957/02/14 (1957)
                    '1960-09-29_spotlight_of_history_on_the_un', // Spotlight Of History On The U.N, 1960/09/29 (1960)
                    '1947-01-13_US_Will_Keep_Faith_Says_Byrnes', // U. S. Will Keep Faith Says Byrnes, 1947/01/13 (1947)
                    '1964-10-15_Khrushchev_Resigns', // Khrushchev Resigns, 1964/10/15 (1964)
                    '1933-10-04_President_Asks_Church_Leaders', // President Asks Church Leaders, 1933/10/04 (1933)
                    '1933-10-23_Russian_Recognition_Nears', // Russian Recognition Nears, 1933/10/23 (1933)
                    '1946-01-31_Radar_makes_Round_Trip_To_Moon', // Radar makes Round Trip To Moon, 1946/01/31 (1946)
                    '1941-04-17_Baby_Bonds_For_Defense', // Baby Bonds For Defense, 1941/04/17 (1941)
                    '1944-06-01_Allies_Close_On_Rome', // Allies Close On Rome, 1944/06/01 (1944)
                    '1962-07-23_Kennedy_on_Telstar', // Kennedy on Telstar. Europe /sees News Conference, 1962/07/23 (1962)
                    '1933-11-06_Farmers_Arm_To_Break_Picket_Line', // Farmers Arm To Break Picket Line, 1933/11/06 (1933)
                    '1959-08-27_New_York_City', // New York City, 1959/08/27 (1959)
                    '1956-07-23_Ike_In_Panama', // Ike In Panama. Urges Atom Plan for Hemisphere, 1956/07/23 (1956)
                    '1945-06-25_President_on_Tour', // President on Tour, 1945/06/25 (1945)
                    '1958-07-07_De_Gaulle_And_Dulles_Meet', // De Gaulle And Dulles Meet, 1958/07/07 (1958)
                    '1965-08-30_Enterprise_in_War', // Enterprise in War. Nuclear Carrier Joins 7th Fleet, 1965/08/30 (1965)
                    '1933-07-17_Huge_Throngs_Welcome_Balbo', // Huge Throngs Welcome Balbo, 1933/07/17 (1933)
                    '1944-12-22_Russians_In_New_Drive', // Russians In New Drive, 1944/12/22 (1944)
                    '1958-07-24_Akron_Ohio', // Akron, Ohio, 1958/07/24 (1958)
                    '1933-09-04_5_Nations_Seek_Balloon_Title', // 5 Nations Seek Balloon Title, 1933/09/04 (1933)
                    '1960-05-12_powers_case', // Powers Case. Ike States Policy On Spies and Open Skies, 1960/05/12 (1960)
                    '1933_Soviet_Envoy_Talks_With_Roosevelt', // Soviet Envoy Talks With Roosevelt, ca. 1933 (1933)
                    '1961-11-30_New_Mexico', // New Mexico, 1961/11/30 (1961)
                    '1940-05-13_Washington_DC', // Washington DC, 1940/05/13 (1940)
                    '1961-04-13_Cosmos_Pioneer', // Cosmos Pioneer. Soviets Orbit Man In Space, 1961/04/13 (1961)
                    '1936-06-24_Democrats_Cheer', // Democrats Cheer, 1936/06/24 (1936)
                    '1959-01-05_New_Delhi_India', // New Delhi, India, 1959/01/08 (1959)
                    '1967-12-12_Lynda_And_Charles_Marriage', // Lynda And Charles Marriage Takes Place In The White House, 1967/12/12 (1967)
                    '1932-02-22_Sudden_Gale_Akron_at_Lakehurst_NJ', // Sudden Gale Akron at Lakehurst NJ 1932/02/22 (1932)
                    '1940-10-30_Nations_Draft_Lottery_Held', // Nation's Draft Lottery Held, 1940/10/30 (1940)
                    '1955-07-25_Ike_Returns', // Ike Returns. Sees Progress at Geneva Conference, 1955/07/25 (1955)
                    '1958-06-09_Brooklyn_NY', // Brooklyn, N.Y. 1958/06/09 (1958)
                    '1937-10-06_US_Faces_War_Says_Roosevelt', // U.S. Faces War Says Roosevelt, 1937/10/06 (1937)
                    '1959-01-29_Deny_Rocket_Lag', // Deny Rocket Lag. Atlas Firing Keynotes U.S. Missile Build-Up, 1959/01 (1959)
                    '1960-09-19_mexico', // Mexico, 1960/09/19 (1960)
                    '1962-03-22_India', // India, 1962/03/22 (1962)
                    '1933-09-26_Great_Throngs_Hail_Crack_Regiment', // Great Throngs Hail Crack Regiment , 1933/09/26 (1933)
                    '1942-02-02_Churchill_Safe_At_Home', // Churchill Safe At Home, 1942/02/02 (1942)
                    '1941-04-12_US_To_Guard_Greenland', // U.S. To Guard Greenland,1941/04/12 (1941)
                    '1933-08-14_President_Visits_Foresters', // President Visits Foresters, 1933/08/14 (1933)
                    '1959-08-27_Denver', // Denver, 1959/08/27 (1959)
                    '1934-11-28_Five_and_Ten_Princess_Home_Again', // "Five and Ten" Princess Home Again, 1934/11/28 (1934)
                    '1938-06-27_World-Wide_News_Events', // World-Wide News Events, 1938/06/27 (1938)
                    '1938-06-22_World_of_Sports', // World of Sports, 1938/06/22 (1938)
                    'Universal_Newsreel_Mexican_Labor', // Good Neighbor Labor Supply (1950)
                    '1957-06-06_French_Air_Show', // French Air Show, 1957/06/06 (1957)
                    '1937-05-12_Remarkable_New_Aid_To_Navigation', // Remarkable New Aid To Navigation, 1937/05/12 (1937)
                    '1965-06-21_Missile_Passes_Test', // Missile Passes Test. Titan 3-C is Most Powerful Known, 1965/06/21 (1965)
                    '1935-03-04_FDR_Buys_First_Baby_Bond', // FDR Buys First Baby Bond, 1935/03/04 (1935)
                    '1957-10-10_Ike_Denies_US_lag', // Ike Denies U.S. lag In Missiles, 1957/10/10 (1957)
                    '1959-07-23_Nixons_Moscow_Mission', // Nixon's Moscow Mission, 1959/07/23 (1959)
                    '1947-01-16_New_Head_Of_Church_Installed', // New Head Of Church Installed, 1947/01/16 (1947)
                    '1947-01-06_80th_Congress_Convenes', // 80th Congress Convenes, 1947/01/06 (1947)
                    '1945-02-12_Life-Line_To_China_Re-Opened', // Life-Line To China Re-Opened, 1945/02/12 (1945)
                    '1933-11-01_Help_Needy_Says_First_Lady', // Help Needy Says First Lady, 1933/11/01 (1933)
                    '1961-04-06_Anglo-US_Amity', // Anglo-U.S. Amity. U.S.-British Pledge United Front , 1961/04/06 (1961)
                    '1962-08-16_25_Years_Ago', // 25 Years Ago, 1962/08/16 (1962)
                    '1959-06-01_Khrushchevs_Mystery_Trip', // Khrushchev's Mystery Trip To Albania, 1959/06/01 (1959)
                    '1955-08-11_Hoover_81', // Hoover 81. Shrine made of Boyhood Home, 1955/08/11 (1955)
                    '1961-02-09_NATO_War_Games', // NATO War Games. Germany Is Stage For Big Winter Maneuvers, 1961/02/09 (1961)
                    '1938-11-02_Light_Tanks_Show_Their_Prowess', // Light Tanks Show Their Prowess In Battle Maneuvers, 1938/11/02 (1938)
                    '1956-08-09_Press_Parley', // Press Parley. Ike Urges Caution on Seizure of Suez, 1956/08/09 (1956)
                    '1933-10-16_Navy_Planes_End_Distance_Hop', // Navy Planes End Distance Hop, 1933/10/16 (1933)
                    '1955-07-18_At_the_Summit', // At the Summit, 1955/07/18 (1955)
                    '1960-10-06_Florida', // Florida, 1960/10/06 (1960)
                    '1933-10-25_State_Theatre_in_Richmond', // State Theatre in Richmond, 1933/10/25 (1933)
                    '1956-07-16_Freedom_Flight', // Freedom Flight. Hungarians Seize Plane to Germany, 1956/07/16 (1956)
                    '1933-11-20_US_Recognizes_Soviet_Russia', // U.S. Recognizes Soviet Russia, 1933/11/20 (1933)
                    '1944-04-27_Great_Day_For_The_Kellys', // A Great Day For The Kellys,1944/04/27 (1944)
                    '1945-02-05_MacArthur_Makes_Good_His_Promise', // MacArthur Makes Good His Promise,1945/02/05 (1945)
                    '1959-02-09_Titan_Launched', // 'Titan' Launched. 1st Test Of Newest ICBM Is Successful, 1959/02/09 (1959)
                    '1961-05-11_Russia', // Russia, 1961/05/11 (1961)
                    '1962-08-13_Income_Tax_Cut', // Income Tax Cut. Kennedy Hopes To Spur Economy, 1962/08/13 (1962)
                    '1959-10-05_Free_China', // Free China. 10 years On Formosa, 1959/10/05 (1959)
                    '1956-05-03_Sea_Sentinel', // ea Sentinel. Navy Demonstrates Offshore Radar, 1956/05/03 (1956)
                    '1960-07-25_republican_convention_highlights', // Republic Convention Highlights, 1960/07/25 (1960)
                    '1937-10-04_Hoover_Blasts_Parole_Boards', // G-Man Hoover Blasts Lenient Parole Boards, 1937/10/04 (1937)
                    '1941-04-29_Aid_Britain_Says_Hull', // Aid Britain Says Hull, 1941/04/29 (1941)
                    '1959-01-12_5th_Republic', // 5th Republic, New Era Dawns As De Gaulle Invested, 1959/01/12 (1959)
                    '1944-12-29_Solons_Visit_Front', // Solons Visit Front,1944/12/29 (1944)
                    '1933-07-12_Balbo_Nears_American_Goal', // Balbo Nears American Goal, 1933/07/12 (1933)
                ],
            }
            ],
        },

        // Mission Control: NASA's own films, Mercury to the Shuttle.
        10: {
            sources: [
            {
                series: null,
                ids: [
                    'Jsc-500Apollo8-goForTli.wmv', // JSC-500 Apollo 8-Go For TLI.wmv (1969)
                    'JSC_852_Building_Toward_New_Heights.wmv', // JSC_852_Building_Toward_New_Heights.wmv (1987)
                    'circuits_in_space', // Electrical Circuits in Space: The Electrodynamics of the Tethered Sate (1996)
                    'physics_of_toys_in_space', // Physics of Toys In Space (1993)
                    'Jsc-580Apollo16-NothingSoHidden.wmv_417', // JSC-580 Apollo 16 - Nothing So Hidden.wmv (1972)
                    'CMP306_Reflections.wmv', // CMP306_Reflections.wmv (1969)
                    'Jsc-498FlightOfApollo7.wmv', // JSC-498 Flight of Apollo 7.wmv (1968)
                    'Skylab-SpaceStationI', // SKYLAB - SPACE STATION I (1973)
                    'MissionOfApollo-soyuz', // MISSION OF APOLLO-SOYUZ (1975)
                    'SpaceBasics', // SPACE BASICS (1991)
                    'Hq-194_apollo11TheEagleHasLanded2.wmv', // HQ-194_Apollo 11 The Eagle Has Landed 2 .wmv (1969)
                    'JSC272_Lunar_Space_Suits.wmv', // JSC272_Lunar_Space_Suits.wmv (1966)
                    'Jsc-519Apollo10-toSortOutTheUnknowns.wmv', // JSC-519 Apollo 10-To Sort Out the Unknowns.wmv (1969)
                    'JSC315_Fly_Me_To_The_Moon_And_Back.wmv', // JSC315_Fly_Me_To_The_Moon_And_Back.wmv (1966)
                    'space_basics_5-8', // Liftoff to learning : Space basics. (1991)
                    'return_to_space', // Return To Space: STS-26 (1988)
                    'JSC336_Launch_Windows_for_Lunar_Landing.wmv', // JSC336_Launch_Windows_for_Lunar_Landing.wmv (1967)
                    'starfinder_30_cosmology', // Starfinder, Episode 30: Cosmology (1991)
                    'JSC345_Apollo_Atmospheric_Entry_Phase.wmv', // JSC345_Apollo_Atmospheric_Entry_Phase.wmv (1968)
                    'NewtonInSpace', // NEWTON IN SPACE (1992)
                    'Jsc-509Apollo9-threeToMakeReady.wmv', // JSC-509 Apollo 9-Three To Make Ready.wmv (1969)
                    'CMP235_Our_Star_The_Sun_Episode1.wmv', // CMP235_Our_Star_The_Sun_Episode1.wmv (1988)
                    'CMP237_Earth_the_Planet_Episode4.wmv', // CMP237_Earth_the_Planet_Episode4.wmv (1988)
                    'tethered_satellite', // Liftoff to Learning: Tethered Satellite Forces and Motion (1994)
                    'Jsc-0180_projectMercurySummation.wmv', // JSC-0180_Project Mercury Summation.wmv (1963)
                    'SURVIVAL_563', // SURVIVAL (1976)
                    'JSC344_Lunar_Orbit_Rendezvous.wmv', // JSC344_Lunar_Orbit_Rendezvous.wmv (1968)
                    'JSC_830_We_Deliver.wmv', // JSC_830_We_Deliver.wmv (1983)
                    'endeavour_then_and_now', // Liftoff To Learning: Voyage of Endeavour, Then and Now (1992)
                    'CMP236_Viel_of_Venus_Episode3.wmv', // CMP236_Viel_of_Venus_Episode3.wmv (1988)
                    'HQ167_Assignment_Shoot_The_Moon_Episode5.wmv', // HQ167_Assignment_Shoot_The_Moon_Episode5.wmv (1967)
                    'CMP_254_Extraterrestrials_Episode13.wmv', // CMP_254_Extraterrestrials_Episode13.wmv (1988)
                    'Cmp-247ZeroGAndSpaceSuits.wmv', // CMP-247 Zero G and Space Suits.wmv (1988)
                    'JSC_824_Opening_New_Frontiers.wmv', // JSC_824_Opening_New_Frontiers.wmv (1982)
                    'CMP293_The_Day_Before.wmv', // CMP293_The_Day_Before.wmv (1988)
                    'Jsc-1238_underTheSea.wmv', // JSC-1238_Under the Sea.wmv (1994)
                    'Cmp-0246_ingredientsForSpaceTravel.wmv', // CMP-0246_Ingredients For Space Travel.wmv (1988)
                ],
            }
            ],
        },

        // Atomic Age: civil defence, the peaceful atom, science class.
        11: {
            sources: [
            {
                series: null,
                ids: [
                    'bacteria_friend_and_foe', // Bacteria: Friend and Foe
                    'DuckandC1951', // Duck and Cover (1951)
                    'isforAto1953', // A is for Atom (1953)
                    'AtomBomb1946', // Atom Bomb [Joe Bonica's Movie of the Month] (1955)
                    'Survival1951', // Survival Under Atomic Attack (1951)
                    'Operatio1955', // Operation Cue (1955) (1955)
                    'TaleofTw1946', // Tale of Two Cities, A (1946)
                    'AtomicAl1951', // Atomic Alert (Elementary version) (1951)
                    'AboutFal1963', // About Fallout (1963) (1963)
                    'StaySafe1960', // Stay Safe, Stay Strong: The Facts About Nuclear Weapons (1960)
                    'AboutFal1955', // About Fallout (1955) (1955)
                    'Operatio1964', // Operation Cue (1964 revision) (1964)
                    'BigBounc1960', // Big Bounce, The (1960)
                    'Heavenly1920', // Heavenly Bodies
                    'SpecialD1946', // Special Delivery (1946)
                    '200634_The_Growth_of_Plants', // The Growth of Plants
                    'ManandHi1954', // Man and His Culture (1954)
                    'WhyStudy1955_2', // Why Study Science? (1955)
                    'OurCitie1951', // Our Cities Must Fight (1951)
                    'ProjectD1960', // Project Dugout (1960)
                    'life_cycle_of_the_mosquito', // Life Cycle of the Mosquito, The
                    'preciptins', // Precipitins (1930)
                    'HanfordS1957', // Hanford Science Forum (1957)
                    '201576_The_Big_Bounce', // The Big Bounce (1962)
                    '200387_Water_Cycle', // The Water Cycle (1947)
                    'The_Story_of_Television', // The Story of Television (1956)
                    '200430_The_Wearing_Away_Of_The_Land', // The Wearing Away of the Land (1939)
                    '201180_Atoms_in_the_Marketplace', // Atoms in the Marketplace (1968)
                    '1627TheScientificMethod', // Scientific Method, The (1954)
                    '200330_How_The_Ear_Functions', // How The Ear Functions (1941)
                    '200396_Erosion', // Erosion (1948)
                    '201300_Pirro_and_The_Magnet', // Pirro and The Magnet (1948)
                    '201447_Science_News_Vol_1', // Science News, Volume 1
                    'Eyes_And_Their_Care', // The Eyes and Their Care (An Introduction) (1941)
                    'National_Geographic_Whales_01', //
                    '201298_The_Experimental_Psychology_of_Vision', // The Experimental Psychology of Vision (1941)
                    '200497_The_Suns_Family', // The Sun's Family (1950)
                    { seq: ['DayCalle1955', 'DayCalle1955_2'] }, // Day Called X, A, in 2 parts
                    { seq: ['highlights_1965_1', 'highlights_1965_2', 'highlights_1965_3'] }, // Highlights 1965: A Progress Report, in 3 parts
                    { seq: ['Operatio1946', 'Operatio1946_2'] }, // Operation Crossroads, in 2 parts
                    { seq: ['AtomicPo1958', 'AtomicPo1958_2'] }, // Atomic Power at Shippingport, in 2 parts
                    { seq: ['Plowshar1961', 'Plowshar1961_2'] }, // Plowshare, in 2 parts
                    { seq: ['AtomicEn1955', 'AtomicEn1955_2'] }, // Atomic Energy as a Force for Good, in 2 parts
                    { seq: ['Sciencei1956_9', 'Sciencei1956_10'] }, // Science in Action: Submarines, in 2 parts
                    { seq: ['Sciencei1956_11', 'Sciencei1956_12'] }, // Science in Action: The Flow of Heat, in 2 parts
                    { seq: ['Sciencei1956_3', 'Sciencei1956_4'] }, // Science in Action: Drilling for Oil, in 2 parts
                    { seq: ['Sciencei1956_7', 'Sciencei1956_8'] }, // Science in Action: Rivers of Ice, in 2 parts
                    { seq: ['Sciencei1956', 'Sciencei1956_2'] }, // Science in Action: Aero Medicine, in 2 parts
                    { seq: ['Sciencei1956_5', 'Sciencei1956_6'] }, // Science in Action: Radar Defense Screen, in 2 parts
                    'Principles_of_Current_Electricity_Part_2', // Principles of Current Electricity (Part 2)
                    '205084_Exploring_the_Spectrum_P2', // Exploring the Spectrum (Part 2)
                ],
            }
            ],
        },

        // Social Guidance: how to behave, according to a filmstrip.
        12: {
            sources: [
            {
                series: null,
                ids: [
                    'GoodEati1951', // Good Eating Habits (1951)
                    'HowtoBeW1949', // How to Be Well Groomed (1949)
                    'DatingDo1949', // Dating: Do's and Don'ts (1949)
                    'DateWith1950', // Date With Your Family, A (1950)
                    'GoodTabl1951', // Good Table Manners (1951)
                    'HowMuchA1958', // How Much Affection? (1958)
                    'CindyGoe1955', // Cindy Goes to a Party (1955)
                    'ThisChar1950', // This Charming Couple (1950)
                    'AskMeDon1961', // Ask Me, Don't Tell Me (1961)
                    'AreYouRe1950', // Are You Ready for Marriage? (1950)
                    'ShyGuy1947', // Shy Guy (1947)
                    'ActYourA1949', // Act Your Age (1949)
                    'HabitPat1954', // Habit Patterns (1954)
                    'WhattoDo1950', // What to Do on a Date (1950)
                    'Everyday1948', // Everyday Courtesy (1948)
                    'Maintain1947', // Maintaining Classroom Discipline (1947)
                    'WhatMake1950', // What Makes A Good Party? (1950)
                    'HowDoYou1950', // How Do You Know It's Love? (1950)
                    'Beginnin1953', // Beginning to Date (1953)
                    'GoingSte1951', // Going Steady? (1951)
                    'PromItsA1961', // Prom: It's A Pleasure!, The (1961)
                    'ControlY1950', // Control Your Emotions (1950)
                    'OfficeEt1950', // Office Etiquette (1950)
                    'Choosing1950', // Choosing for Happiness (1950)
                    'IWanttoB1941', // I Want to Be a Secretary (1941)
                    'FamilyLi1949', // Family Life (1949)
                    'WhosBoss1950', // Who's Boss? (1950)
                    'BullyThe1952', // Bully, The (1952)
                    'Cheating1952', // Cheating (1952)
                    'DontBeAf1953', // Don't Be Afraid (1953)
                    'JuniorPr1946', // Junior Prom (1946)
                    'HowtoSay1951', // How to Say No: Moral Maturity (1951)
                    'MentalHe1952', // Mental Health: Keeping Mentally Fit (1952)
                    'AsOthers1953', // As Others See Us (1953)
                    'SchoolRules', // School Rules: How They Help Us (1953)
                    'DinnerPa1945', // Dinner Party (1945)
                    'Gossip1953', // Gossip (1953)
                    'BetterUs1950', // Better Use of Leisure Time (1950)
                    'HowQuiet1953', // How Quiet Helps at School (1953)
                    'SnobThe1958', // Snob, The (1958)
                    'Benefits1950', // Benefits of Looking Ahead, The (1950)
                    'MindYour1953', // Mind Your Manners (1953)
                    'TowardEm1954', // Toward Emotional Maturity (1954)
                    'JohnnyLe1946', // Johnny Learns His Manners (1946)
                    'LetsBeGo1953', // Let's Be Good Citizens at School (1953)
                    'SelfCons1951', // Self-Conscious Guy (1951)
                    'WaystoSe1950', // Ways to Settle Disputes (1950)
                    'IsThisLove', // Is This Love? (1957)
                    'FunofBei1950', // Fun of Being Thoughtful, The (1950)
                    'DiningTo1951', // Dining Together (1951)
                    'YourFami1948', // Your Family (1948)
                    'Understa1950', // Understand Your Emotions (1950)
                    'AmITrust1950', // Am I Trustworthy? (1950)
                    'HowtoKee1949', // How to Keep a Job (1949)
                    'HelpingJ1956', // Helping Johnny Remember (1956)
                    'LawandSo1949', // Law and Social Controls (1949)
                    'SocialCo1951', // Social Courtesy (1951)
                    'Holidayf1959', // Holiday from Rules? (1959)
                    'Beginnin1951', // Beginning Responsibility: Taking Care of Things (1951)
                    'Understa1950_2', // Understanding Your Ideals (1950)
                    'OfficeCo1952', // Office Courtesy: Meeting the Public (1952)
                    'Developi1951', // Developing Self-Reliance (1951)
                    'Overcomi1950', // Overcoming Fear (1950)
                    'HowDoYou1946', // How Do You Do? (1946)
                    'HowHones1950', // How Honest Are You? (1950)
                    'SnapOuto1951', // Snap Out of It! (Emotional Balance) (1951)
                    'Attitude1949', // Attitudes and Health (1949)
                    'Outsider1951', // Outsider, The (1951)
                    'WhosRigh1954', // Who's Right? (1954)
                    'Friendsh1949', // Friendship Begins At Home (1949)
                    'TableMan1947', // Table Manners (1947)
                    'Emotiona1957', // Emotional Maturity (1957)
                    'TroubleM1959', // Trouble Maker, The (1959)
                    'Marriage1950', // Marriage Today (1950)
                    'YourThri1948', // Your Thrift Habits (1948)
                    'WritingB1950', // Writing Better Social Letters (1950)
                    'Measureo1962', // Measure of a Man (1962)
                    'GossipTh1955', // Gossip, The (1955)
                    'YouandYo1946', // You and Your Family (1946)
                    'LetsPlay1949', // Let's Play Fair (1949)
                    'OtherFel1937', // Other Fellow, The (1937)
                    'SharingW1949', // Sharing Work At Home (1949)
                    'Procrast1952', // Procrastinator, The (1952)
                    'PlayingT1950', // Playing Together (1950)
                    'ItsAllin1954', // It's All in Knowing How (1954)
                    'GoodSpor1950', // Good Sportsmanship (1950)
                    'WhatAbou1958', // What About School Spirit? (1958)
                    'ItTakesA1950', // It Takes All Kinds (1950)
                    'LetsShar1950', // Let's Share With Others (1950)
                    'Obligati1950', // Obligations (1950)
                    'Understa1959', // Understanding Others (1959)
                    'OtherPeo1951', // Other People's Property (1951)
                    'OtherFel1951', // Other Fellow's Feelings, The (1951)
                    'OurCommu1952', // Our Community (1952)
                    'Responsi1953', // Responsibility (1953)
                    'GoodLose1953', // Good Loser, The (1953)
                    'Turnabou1936', // Turnabout Man (1936)
                    'EatforHe1954', // Eat for Health (1954)
                    'TouchofM1961', // Touch of Magic, A (1961)
                    'HomeElec1944', // Home Electrical Appliances (1944)
                    'JayCanDoIt', // Jay Can Do It (1965)
                    'Practica1957', // Practical Dreamer (1957)
                    'TimeForCoffe', // Time For Coffee
                    'Restaura1946', // Restaurant Operator, The (1946)
                    { seq: ['new_girl_in_the_office_1', 'new_girl_in_the_office_2'] }, // New Girl in the Office, in 2 parts
                    { seq: ['MotherTa1952', 'MotherTa1952_2'] }, // Mother Takes a Holiday, in 2 parts
                    'MakingaN1946_2', // Making a New Day Out of Tuesday (Part II) (1946)
                    'HomeEcon1951', // Home Economics Story, The (Part I) (1951)
                    { seq: ['Fortunei1951', 'Fortunei1951_2'] }, // Fortune in Two Old Trunks, A, in 2 parts
                ],
            }
            ],
        },

        // Industry on Parade: sponsored films about things being made.
        13: {
            sources: [
            {
                series: null,
                ids: [
                    'FromtheG1954', // From the Ground Up (1954)
                    'Usingthe1947', // Using the Bank (1947)
                    'ForHealt1941', // For Health and Happiness (1941)
                    'OutofThi1954', // Out of This World (1954)
                    'RelaxedW1957', // Relaxed Wife, The (1957)
                    'FoodforF1943', // Food for Fighters (1943)
                    'DeathtoW1947', // Death to Weeds (1947)
                    'this_is_hormel', // This Is Hormel (1965)
                    'MorePowe1930', // More Power to You
                    'DowntheG1935', // Down the Gasoline Trail (1935)
                    'InsideSt1946', // Inside Story of Modern Gasoline, The (1946)
                    'FrontLin1965', // Front Line, The (1965)
                    'AutoLite1940', // Auto-Lite on Parade (1940)
                    'HowTexti1948', // How Textile Mills Are Modernizing (1948)
                    'Frontier1937', // Frontiers of the Future (A Screen Editorial With Lowell Thomas) (1937)
                    'magicwhe', // The Magic Wheel (1952)
                    'TipTopsi1934', // Tip-Tops in Peppyland, The (1934)
                    'carving_magic', // Carving Magic
                    'Assignme1956', // Assignment: Venezuela (1956)
                    'AsWeLikeIt', // As We Like It (1952)
                    'OpenRoadA', // Open Road A (1951)
                    'Visionin1957', // Vision in the Forest (1957)
                    'OpenRoadB', // Open Road B (1951)
                    'BanksAndCred', // Banks And Credits (1948)
                    'RedwoodS1940', // Redwood Saga (1940)
                    'HumanBri1949', // Human Bridge, The (1949)
                    'BigDeliv1951', // Big Delivery Wagon, The (1951)
                    'Miracles1960', // Miracles From Agriculture (1960)
                    'Poultryo1937', // Poultry on the Farm (1937)
                    'GoodWrin1951', // Good Wrinkles (1951)
                    'NewNeigh1953', // New Neighbor (1953)
                    'American1960', // American Maker (1960)
                    'Progress1960', // Progress Parade (1960)
                    'FellingF1920', // Felling Forest Giants
                    'UncleJim1963', // Uncle Jim's Dairy Farm (1963)
                    'GreaterG1953', // Greater Goal: Human Dividends from American Industry, The (1953)
                    'Streamli1936', // Streamlines (1936)
                    'Pickofth1939', // Pick of the Pod (1939)
                    'thrill_drivers_choice', // Thrill Driver's Choice (1956)
                    'ForGoodL1937', // For Good Living (Brown Derby Beer Promo) (1937)
                    'WhiteAmm1942', // White Ammunition (1942)
                    'Californ1958', // California Is Climate (1958)
                    'CurtissW1944', // Curtiss-Wright Shorts (7 Subjects) (1944)
                    'WoodForW1942', // Wood For War (1942)
                    'MeatsWit1946', // Meats With Approval (1946)
                    'OilforAl1949', // Oil for Aladdin's Lamp (revised version) (1949)
                    'ThisIsth1957', // This Is the Dairy Industry (1957)
                    'TripleGo1948', // Triple Goodness (1948)
                    'Giftsoft1946', // Gifts of the Sun (1946)
                    'ChanceYouTak', // Chance You Take
                    'GoldenHa1950', // Golden Harvest...Fifty Years of Calpak Progress
                    'Storyofa1954', // Story of a Forest Ranger, The (1954)
                    'ScienceAndAg', // Science and Agriculture: The Soy Bean (1952)
                    'Emergenc1945', // Emergency in Honduras (1945)
                    'Future_Unlimited_02', // Future Unlimited
                    'Successi1928', // Success in Business (1928)
                    'Airport_America', // Airport America (1954)
                    'Flying_Businessman', // Flying Businessman (1953)
                    'Canada-The_Prairie_Provinces', // Canada - The Prairie Provinces (Second Edition) (1958)
                    'everybody-knows-001', // Everybody Knows
                    'A_Tree_Grows_For_Christmas', // A Tree Grows for Christmas (1949)
                    'Design_For_More_Eggs', // Design For More Eggs (1962)
                    'Studebaker_Promo', // Studebaker Sales Training Film
                    'Forests_Are_Born', //
                    'footage_panix_VMen', // V-Men (1941)
                    'Strohm_0042', // Strohm 0042
                    'Whats_In_It_For_Me', // What's In It For Me?
                    'Strohm_0049', // Strohm 0049
                    'Wonderfu1958', // Wonderful World of Wash 'n' Wear, The (1958)
                    'Frigidai1957', // Frigidaire Finale 1957 (1957)
                    'Goodbye_Mr_Roach', // Good-bye, Mr. Roach (1959)
                    'BeetHitler', // Trimming Beets
                    'Calvin_0304', // Calvin 0304
                    'Strohm_0045', // Strohm 0045
                    'Calvin_0305', // Calvin 0305
                    'Goodbye_Mrs_Ant', // Goodbye, Mrs. Ant!
                    { seq: ['American1958', 'American1958_2', 'American1958_3'] }, // American Look, in 3 parts
                    { seq: ['BeefRing1960', 'BeefRing1960_2'] }, // Beef Rings the Bell, in 2 parts
                    { seq: ['MasterHa1936', 'MasterHa1936_2', 'MasterHa1936_3', 'MasterHa1936_4'] }, // Master Hands, in 4 parts
                    { seq: ['American1955', 'American1955_2'] }, // American Harvest, in 2 parts
                    { seq: ['HenryFor1962', 'HenryFor1962_2'] }, // Henry Ford's Mirror of America, in 2 parts
                    { seq: ['FromDawn1937', 'FromDawn1937_2', 'FromDawn1937_3'] }, // From Dawn to Sunset, in 3 parts
                    { seq: ['VisittoW1950', 'VisittoW1950_2'] }, // Visit to Wurlitzer, A, in 2 parts
                    { seq: ['Tomorrow1941', 'Tomorrow1941_2'] }, // Tomorrow Always Comes, in 2 parts
                    { seq: ['American1956', 'American1956_2', 'American1956_3', 'American1956_4'] }, // American Engineer, in 4 parts
                    { seq: ['TwentyFo1950', 'TwentyFo1950_2'] }, // Twenty-Four Hours of Progress, in 2 parts
                    'American1953', // American Frontier (Part I) (1953)
                    { seq: ['DesertVe1958', 'DesertVe1958_2'] }, // Desert Venture, in 2 parts
                    { seq: ['wonderful_world_1', 'wonderful_world_2', 'wonderful_world_3'] }, // Wonderful World, in 3 parts
                    { seq: ['AlaskasS1936', 'AlaskasS1936_2'] }, // Alaska's Silver Millions, in 2 parts
                    { seq: ['GeneralM1927', 'GeneralM1927_2', 'GeneralM1927_3', 'GeneralM1927_4'] }, // General Motors Around the World, in 4 parts
                    'Trailoft1951', // Trail of the Rocket (Part I) (1951)
                    { seq: ['Miracleo1956', 'Miracleo1956_2'] }, // Miracle of the Can, in 2 parts
                    { seq: ['FoodforA1941', 'FoodforA1941_2'] }, // Food for America, in 2 parts
                    { seq: ['quality_control_1', 'quality_control_2'] }, // Quality Control in Modern Merchandising, in 2 parts
                    { seq: ['Protecti1952', 'Protecti1952_2'] }, // Protecting Poultry Profits, in 2 parts
                    { seq: ['FromTree1931', 'FromTree1931_2'] }, // From Trees to Tribunes, in 2 parts
                    { seq: ['these_are_my_people_1', 'these_are_my_people_2'] }, // These Are My People, in 2 parts
                    { seq: ['pages_from_an_open_book_1', 'pages_from_an_open_book_2'] }, // Pages From an Open Book, in 2 parts
                ],
            }
            ],
        },

        // The Open Road: cars, driver education, aviation and travel.
        14: {
            sources: [
            {
                series: null,
                ids: [
                    'Automoti1940', // Automotive Service (1940)
                    'HowtoGoP1954', // How to Go Places (1954)
                    'Designfo1956', // Design for Dreaming (1956)
                    'RideforC1937', // Ride for Cinderella, A (1937)
                    'ToNewHor1940', // To New Horizons (1940)
                    'Corvairi1960', // Corvair in Action, The (1960)
                    'Wonderfu1960', // Wonderful New World of Fords, A (1960 Ford Spot) (1960)
                    'InMyMerr1932', // In My Merry Oldsmobile (1932)
                    'TouchofM1961', // Touch of Magic, A (1961)
                    'Aroundth1937', // Around the Corner (1937)
                    'GreatNew1952', // Great New Star, A (1952)
                    'SeeingLo1920', // Seeing London
                    'SailingAlong', // Sailing Along
                    'PlaneTal1965', // Plane Talk (1965)
                    'HowYouSe1936', // How You See It (1936)
                    'Birthoft1945', // Birth of the B-29 (1945)
                    'GiveYour1954', // Give Yourself the Green Light (1954)
                    'Helicopt1953', // Helicopter, The (1953)
                    'Coachfor1936', // Coach for Cinderella, A (1936)
                    'Tomorrow1954', // Tomorrow's Drivers (1954)
                    'Conqueri1937', // Conquering Roads (1937)
                    'Somethin1940', // Something for Nothing (1940)
                    'ToughFri1938', // Tough Friends (1938)
                    'OldsMinu1948', // Olds Minute Movies [Futuramic 1948] (1948)
                    'Sentinel1955', // Sentinel in the Sky (1955)
                    'AllAmeri1936', // All-American Soap Box Derby, The (1936) (1936)
                    'Chevrole1936_3', // Chevrolet Leader News (Vol. 2, No. 3) (1936)
                    'OvertheW1938', // Over the Waves (1938)
                    'FreeAir1937', // Free Air (1937)
                    'facts_on_friction', // Facts on Friction (1934)
                    'YourPerm1951', // Your Permit to Drive (1951)
                    'AirportT1948', // Airport, The (1948)
                    'Wheelsof1927', // Wheels of Progress (1927)
                    'Chevrole1937_2', // Chevrolet Leader News (Vol. 3, No. 2) (1937)
                    'OpenRoadA', // Open Road A (1951)
                    'MissionA1942', // Mission Accomplished: The Story of the Flying Fortress (1942)
                    'SkyBillb1935', // Sky Billboards (1935)
                    'AllinOne1938', // All in One (1938)
                    'OpenRoadB', // Open Road B (1951)
                    'AirportA1954', // Airport America (1954)
                    'RoadstoR1950', // Roads to Romance: Coral Gables (1950)
                    'ManhattanWat', // Manhattan Waterfront
                    'RoadstoR1950_2', // Roads to Romance: The Santa Cruz Trail and Land of the Giant Cactus (1950)
                    'RoadsToRoman', // Roads To Romance
                    'HeresLoo1939', // Here's Looking (1939)
                    'Chevrole1937', // Chevrolet Leader News (Vol. 3, No. 1) (1937)
                    'HumanBri1949', // Human Bridge, The (1949)
                    'Building1948', // Building a Highway (1948)
                    'SafeRoad1935', // Safe Roads (1935)
                    'AirTrans1947', // Air Transportation (1947)
                    'American1960', // American Maker (1960)
                    'Chevrole1935_2', // Chevrolet Leader News (Vol. 1, No. 2) (1935)
                    'KeytoOur1952', // Key to Our Horizons (1952)
                    'Agricult1955', // Agricultural Aviation (1955)
                    'Wherethe1955', // Where the Sun Reigns (1955)
                    'Chevrole1936_4', // Chevrolet Leader News (Vol. 2, No. 4) (1936)
                    'OtherFel1937', // Other Fellow, The (1937)
                    'Chevrole1938', // Chevrolet Leader News (Vol. 4, No. 1) (1938)
                    'Introduc1942', // Introduction to Haiti (1942)
                    'WhenYouK1936', // When You Know (1936)
                    'Chevrole1935_3', // Chevrolet Leader News (Vol. 1, No. 3) (1935)
                    'Chevrole1936_2', // Chevrolet Leader News (Vol. 2, No. 2) (1936)
                    'FlyingBu1953', // Flying Businessman (1953)
                    'Streamli1936', // Streamlines (1936)
                    'Chevrole1939', // Chevrolet Leader News (Vol. 4, No. 2) (1939)
                    'thrill_drivers_choice', // Thrill Driver's Choice (1956)
                    'Chevrole1939_3', // Chevrolet Leader News (Vol. 5, No. 2) (1939)
                    'Chevrole1937_4', // Chevrolet Leader News (Vol. 3, No. 4) (1937)
                    'TraderTh1956', // Trader Thorne (1956)
                    'CurtissW1944', // Curtiss-Wright Shorts (7 Subjects) (1944)
                    'JustaSpa1937', // Just a Spark (1937)
                    'Chevrole1936', // Chevrolet Leader News (Vol. 2, No. 1) (1936)
                    'Formatio1936', // Formations (1936)
                    'Chevrole1937_3', // Chevrolet Leader News (Vol. 3, No. 3) (1937)
                    'Chevrole1938_2', // Chevrolet Leader News (Vol. 4, No. 3) (1938)
                    'NaturesC1930', // Nature's Cameo: Bryce Canyon National Park
                    'BuildersOfTh', // Builders Of The Broad Highway 1
                    'ChanceYouTak', // Chance You Take
                    'Future_Unlimited_02', // Future Unlimited
                    'BuildersOfTh_2', // Builders Of The Broad Highway 2
                    'Wild_at_the_Wheel', // Wild at the Wheel (1970)
                    { seq: ['FreedomH1956', 'FreedomH1956_2'] }, // Freedom Highway, in 2 parts
                    { seq: ['LooktoLo1940', 'LooktoLo1940_2'] }, // Look to Lockheed for Leadership, in 2 parts
                    { seq: ['HenryFor1962', 'HenryFor1962_2'] }, // Henry Ford's Mirror of America, in 2 parts
                    { seq: ['CombatAm1945', 'CombatAm1945_2', 'CombatAm1945_3', 'CombatAm1945_4'] }, // Combat America, in 4 parts
                    { seq: ['Flyingwi1953', 'Flyingwi1953_2'] }, // Flying with Arthur Godfrey, in 2 parts
                    { seq: ['MidwestH1952', 'MidwestH1952_2'] }, // Midwest Holiday, in 2 parts
                    { seq: ['coveted_east_indies_1', 'coveted_east_indies_2'] }, // Coveted East Indies, The, in 2 parts
                    { seq: ['roads_to_romance_1', 'roads_to_romance_2'] }, // Roads to Romance, in 2 parts
                    { seq: ['Freedomo1955', 'Freedomo1955_2'] }, // Freedom of the American Road, in 2 parts
                    { seq: ['GeneralM1927', 'GeneralM1927_2', 'GeneralM1927_3', 'GeneralM1927_4'] }, // General Motors Around the World, in 4 parts
                    { seq: ['Triumpho1933', 'Triumpho1933_2'] }, // Triumph of America, in 2 parts
                    { seq: ['DesertEm1948', 'DesertEm1948_2', 'DesertEm1948_3'] }, // Desert Empire, in 3 parts
                    'Trailoft1951', // Trail of the Rocket (Part I) (1951)
                    { seq: ['Flyingth1937', 'Flyingth1937_2'] }, // Flying the Lindbergh Trail, in 2 parts
                    { seq: ['letter_from_an_airline_pilot_1', 'letter_from_an_airline_pilot_2'] }, // Letter From an Airline Pilot, in 2 parts
                    { seq: ['HighwayH1956', 'HighwayH1956_2'] }, // Highway Hearing, in 2 parts
                    { seq: ['TwoPayDa1927', 'TwoPayDa1927_2'] }, // Two Pay Days, in 2 parts
                ],
            }
            ],
        },

        // Jukebox: Soundies, the three-minute music films of the 1940s.
        15: {
            sources: [
            {
                series: null,
                ids: [
                    'SoundieF', // Soundie - Reg Kehoe and his Marimba Queens
                    'LampOfMemory', // Soundie - Lamp Of Memory (1944)
                    'soundie_11', // Soundie - Jiveroo
                    'SoundieM', // Soundie - "Ten Pretty Girls" and "I'll Make You Mine" (1930)
                    'soundie_1', // Soundie - The Hut Sut Song
                    'WhosYourHoot', // Soundie - Who's Yehudi? (1942)
                    'soundie_12', // Soundie - Hollywood Boogie (1946)
                    'SoundieB', // Soundie - Sweet Sue (Just You)
                    'SoundieH', // Soundie - Beyond The Blue Horizon (1944)
                    'soundie_10', // Soundie - A Jazz Etude (1941)
                    'SoundieO', // Soundie - I Can't Give You Anything but Love (1941)
                    'soundie_2', // Soundie - Our Teacher (1943)
                    'SoundieD', // Soundie - Zig Me Baby with a Gentle Zag (1941)
                    'SoundieJ', // Soundie - Stardust
                    'SoundieI', // Soundie - In A Shanty In Old Shanty Town
                    'Havana-Madri_2', // Soundie - Havana-Madrid Show (1941)
                    'soundie_5', // Soundie - [Hawaiian Hula Song]
                    'SoundieL', // Soundie - Lullaby of Broadway
                    'FiestaSoundi', // Fiesta Soundie
                    'soundie_4', // Soundie - Tica Ti Tica Ta
                    'SoundieG', // Soundie - Surrender
                    'soundie_9', // Soundie - Same Old Story
                    'soundie_13', // Soundie - Rambling Wreck from Georgia Tech
                    'SoundieQ', // Soundie - Chime Bells (1943)
                    'SoundieE', // Soundie - What This Country Needs (1941)
                    'SoundieC', // Soundie - Row Row Row
                    'SoundieK', // Soundie - Got To Be This or That (1945)
                    'SoundieP', // Soundie - Once In A While (1941)
                    'soundie_6', // Soundie - Heaven Help A Sailor On A Night Like This
                    'soundie_7', // Soundie - A Little Robin Told Me So
                    'SoundieN', // Soundie - One Look At You
                    '1083SoundieMinnieTheMoocherCabCalloway', // Soundie : Minnie The Moocher (Cab Calloway)
                    'HawaianSoundie', // Hawaian Soundie
                    '1083SoundieShineLouisArmstrong', // Soundie: Shine (Louis Armstrong)
                    '1083SoundieContinentalConnieHaines', // Soundie : Continental (Connie Haine)
                    '1083SoundieGoodSkatesThe', // Soundie : Good Skates, The
                    '1083SoundieHandfulOfClubsATheElginsJuggling', // Soundie : Handful Of Clubs, A (The Elgins Juggling)
                    '1083SoundieBeginTheBeguineVariosAndVida', // 1083 Soundie Begin The Beguine Varios And Vida
                    '1083SoundieSailboatInTheSkyJohnnieJohnston', // Soundie : Sailboat In The Sky (Johnnie Johnston)
                    'SoundieCaldonia_279', // Soundie Caldonia
                    'SoundieThreeWinterSisters000025000244', // Soundie Three Winter Sisters 00 00 25 00 02 44
                    '1083SoundieBrandinTimeRedRiveDave', // 1083 Soundie Brandin Time Red Rive Dave
                    '1083SoundieCanineCapersMaxAndHisGang', // 1083 Soundie Canine Capers Max And His Gang
                    'ja-da', // Ja-Da - Henry Levine soundie (1942)
                    'thirty-two-fifty-a-month', // Buddy Rogers And His Orchestra - Thirty-Two Fifty A Month - Soundie (1941)
                    '1doh1I0hIGVqxCVdf9yDL6Hsmm6cXy', // "WILLIE WILLIE" 1943 SOUNDIE MUSIC VIDEO CALYPSO MUSIC w/ SAM MANNI
                ],
            }
            ],
        },

        // The Late Show: public-domain features.
        16: {
            sources: [
            {
                series: null,
                ids: [
                    'his_girl_friday', // His Girl Friday (1940)
                    'suddenly', // Suddenly (1954)
                    'TheStranger_0', // The Stranger (1946)
                    'mclintok_widescreen', // McLintock! (1963)
                    'ThePhantomoftheOpera', // The Phantom of the Opera (1925)
                    'ScarletStreet', // Scarlet Street (1945)
                    'meet_john_doe', // Meet John Doe (1941)
                    'CarnivalofSouls', // Carnival of Souls (1962)
                    'Nosferatu_most_complete_version_93_mins.', // Nosferatu, eine Symphonie des Grauens (A Symphony of Horror) (1922)
                    'teenagers_from_outerspace', // Teenagers from Outer Space (1959)
                    'Detour', // Detour (1945)
                    'angel_and_the_badman', // Angel and the Badman (1947)
                    'Hitch_Hiker', // The Hitch-Hiker (1953)
                    'white_zombie', // White Zombie (1932)
                    'YoungandInnocentTheGirlWasYoung', // Young and Innocent (The Girl Was Young) (1937)
                    'cco_attackofthegiantleeches', // Attack of the Giant Leeches (1959)
                    'The_General_Buster_Keaton', // The General (complete & clearer) (1926) (1926)
                    'The_House_On_Haunted_Hill', // House on Haunted Hill (1959)
                    'Sabotage_1936', // Sabotage (1936)
                    'Jamaica_Inn', // Jamaica Inn (1939)
                    'NothingSacred', // Nothing Sacred (1937)
                    'kansascityconfidencial', // Kansas City Confidential (1952)
                    'TheTerror', // The Terror (1963)
                    'NightOfTheLivingDead-MPEG', // Night Of The Living Dead (1968)
                    'steamboat_bill_ipod', // Steamboat Bill Jr. (1928)
                    'LifeWithFather', // Life with Father (1947)
                    'The_Killer_Shrews', // Killer Shrews (1959)
                    'The_Bat_Vincent_Price', // The Bat (1959)
                    'The_Little_Shop_of_Horrors.mpeg', // The Little Shop of Horrors (1960)
                    'giant_gila_monster', // Giant Gila Monster, The (1959)
                    'The_Amazing_Transparent_Man', // The Amazing Transparent Man (1960)
                    'doa_ipod', // D.O.A. (1955)
                    'little_princess_ipod', // The Little Princess (1939)
                    'TheScreamingSkull_105', // The Screaming Skull (1958)
                    'BucketOfBlood720p1959', // A Bucket of Blood (1959)
                    'silent-go-west', // Go West (1925)
                    'silent-the-freshman', // The Freshman (1925)
                    'silent-safety-last', // Safety Last! (1923)
                    'the-last-man-on-earth-1964_202312', // The Last Man on Earth (1964) (1964)
                    'silent-seven-chances', // Seven Chances (1925)
                    'dementia-13-1963_202312', // Dementia 13 (1963) (1963)
                    'the-39-steps-1935', // The 39 Steps (1935) (1935)
                    'the-navigator', // The Navigator (1924)
                ],
            }
            ],
        },
    },
};
