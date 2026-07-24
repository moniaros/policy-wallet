
export interface ArticleSection {
    heading?: string;
    text: string;
    image?: string; // Placeholder for future image support
    list?: string[];
    note?: string;
}

export interface Article {
    id: string;
    title: string;
    subtitle: string;
    readTime: string;
    category: string;
    sections: ArticleSection[];
}


export const helpArticles: Record<string, Record<string, Article>> = {
    en: {
        'upload-policy': {
            id: 'upload-policy',
            title: 'How to Upload Your First Policy',
            subtitle: 'Securely digitize your insurance assets in seconds using our AI-powered scanner.',
            readTime: '4 min',
            category: 'Getting Started',
            sections: [
                {
                    heading: 'Preparation',
                    text: 'Before you begin, ensure you have a clear PDF copy or a high-quality photo of your insurance policy document. Our AI works best with documents where the text is clearly legible.',
                    note: 'Top Tip: You can upload multiple files at once if your policy spans several documents.'
                },
                {
                    heading: 'Step 1: Navigate to Wallet',
                    text: 'From your dashboard, locate the "Wallet" tab in the main navigation menu. This is your central hub for all insurance assets.',
                },
                {
                    heading: 'Step 2: Add New Policy',
                    text: 'Click the large teal "Add Policy" button. You will be presented with two options: "Upload Document" and "Manual Entry". Select "Upload Document" for the fastest experience.',
                },
                {
                    heading: 'Step 3: Analyze & Verify',
                    text: 'Once your file is uploaded, our AI will automatically start scanning it. This process usually takes 10-30 seconds. You will see a "Processing" status.',
                    list: [
                        'The AI extracts the Insurer Name',
                        'It identifies the Policy Number',
                        'It captures coverage dates and premiums',
                        'It scans for specific coverage details'
                    ]
                },
                {
                    heading: 'Step 4: Confirm Details',
                    text: 'Review the extracted information. While our AI is highly accurate, it is always good practice to double-check the critical details like start/end dates and premium amounts against your original document. Click "Save" to finish.',
                }
            ]
        },
        'sharing-access': {
            id: 'sharing-access',
            title: 'Sharing Policy Access',
            subtitle: 'Grant secure, temporary, or permanent access to family members or your insurance agent.',
            readTime: '2 min',
            category: 'Collaboration',
            sections: [
                {
                    heading: 'Why Share Access?',
                    text: 'Sharing access is crucial for ensuring your loved ones have access to critical documents in an emergency, or for allowing your agent to review your coverage for gaps.',
                },
                {
                    heading: 'Sharing with Family',
                    text: 'Go to the policy you want to share. Click the "Share" icon (usually looks like a user with a plus sign). Enter the email address of the family member. They will receive a secure link to view the policy.',
                    note: 'They do not need a paid account to view policies you share with them.'
                },
                {
                    heading: 'Sharing with an Agent',
                    text: 'If you are working with an insurance professional, you can grant them "Agent Access". This allows them to see your entire portfolio and propose better coverage options.',
                    list: [
                        'Navigate to "Account" -> "Settings"',
                        'Select "Grant Access"',
                        'Choose "Professional/Agent"',
                        'Enter their professional email address'
                    ]
                }
            ]
        },
        'premium-features': {
            id: 'premium-features',
            title: 'Understanding Premium Benefits',
            subtitle: 'Unlock the full power of AI analysis and unlimited storage with PolicyWallet Premium.',
            readTime: '5 min',
            category: 'Features',
            sections: [
                {
                    heading: 'AI Gap Analysis',
                    text: 'The core benefit of Premium is the deep-dive analysis. Our AI doesn\'t just read your policy; it understands it. It compares your coverage against standard industry benchmarks to find "Gaps" - risks you are exposed to but not covered for.',
                },
                {
                    heading: 'Unlimited Storage',
                    text: 'Free accounts are limited to 3 active policies. Premium allows you to store unlimited policies, including past/expired policies for historical auditing.',
                },
                {
                    heading: 'Priority Support',
                    text: 'Premium members get access to our "Expert Agent" chat. Real human insurance experts (not bots) are available to answer varying questions about your coverage or claims process.',
                    note: 'Support hours are Monday - Friday, 9am - 6pm.'
                }
            ]
        },
        'reset-password': {
            id: 'reset-password',
            title: 'How to Reset Your Password',
            subtitle: 'Regain access to your account securely.',
            readTime: '1 min',
            category: 'Account & Security',
            sections: [
                {
                    heading: 'Forgot Password?',
                    text: 'If you cannot log in, click the "Forgot Password?" link on the sign-in screen. Enter your registered email address.',
                },
                {
                    heading: 'Check Your Email',
                    text: 'We will send a secure, time-sensitive link to your email. Click this link within 30 minutes to set a new password.',
                    note: 'If you do not see the email, check your Spam folder.'
                },
                {
                    heading: 'Change Password from Settings',
                    text: 'If you are already logged in and want to change your password for security reasons, go to "Account" -> "Settings" -> "Security" and select "Change Password".'
                }
            ]
        },
        'notifications': {
            id: 'notifications',
            title: 'Managing Alert Preferences',
            subtitle: 'Customize how and when PolicyWallet contacts you.',
            readTime: '3 min',
            category: 'Settings',
            sections: [
                {
                    heading: 'Notification types',
                    text: 'We send notifications for critical events to keep you protected.',
                    list: [
                        'Renewal Reminders (30, 14, and 3 days before expiry)',
                        'Payment confirmations',
                        'Security alerts (new device logins)',
                        'AI Analysis results'
                    ]
                },
                {
                    heading: 'Customizing Channels',
                    // Three things here were untrue. SMS is not implemented at all —
                    // the preferences route says so in as many words ("not currently
                    // exposed in UI ... preserved for backward compatibility") — and
                    // it was presented as a Premium benefit, i.e. a paid feature that
                    // does not exist. Push is FCM WEB push: there is no mobile app, so
                    // telling people they need one makes them dismiss a channel that
                    // works in their browser. And "Account -> Notifications" is not a
                    // tab; the switches live under Account -> Settings.
                    text: 'Notifications arrive by email. If you allow them in your browser, you can also receive them as push notifications — no app required. Go to Account -> Settings to choose which kinds you want.',
                }
            ]
        },
        'install-pwa': {
            id: 'install-pwa',
            title: 'How to Install the Mobile App',
            subtitle: 'Get PolicyWallet on your home screen for instant access.',
            readTime: '2 min',
            category: 'Mobile App & PWA',
            sections: [
                {
                    heading: 'Progressive Web App (PWA)',
                    text: 'PolicyWallet is a Progressive Web App. This means you can install it directly from your browser without visiting an app store. It works offline and takes up very little space.',
                },
                {
                    heading: 'Installing on iOS (iPhone/iPad)',
                    text: 'Open PolicyWallet in Safari.',
                    list: [
                        'Tap the "Share" button (box with an arrow pointing up)',
                        'Scroll down and tap "Add to Home Screen"',
                        'Tap "Add" in the top right corner'
                    ]
                },
                {
                    heading: 'Installing on Android',
                    text: 'Open PolicyWallet in Chrome.',
                    list: [
                        'Tap the menu icon (three dots) in the top right',
                        'Tap "Install App" or "Add to Home Screen"',
                        'Follow the on-screen prompt'
                    ]
                }
            ]
        },
        'update-payment': {
            id: 'update-payment',
            title: 'Updating Your Payment Method',
            subtitle: 'Securely manage your subscription payment details.',
            readTime: '2 min',
            category: 'Billing & Subscriptions',
            sections: [
                {
                    heading: 'Access Billing Settings',
                    text: 'Go to "Account" -> "Billing". Here you will see your current plan and registered card.',
                },
                {
                    heading: 'Add New Card',
                    text: 'Click "Add Payment Method". Enter your new card details. We support Visa, Mastercard, and American Express. Your card data is encrypted and handled by Stripe; strictly speaking, we never see your full card number.',
                },
                {
                    heading: 'Set as Default',
                    text: 'Once added, click the three dots next to your new card and select "Set as Default". Your next invoice will be charged to this card.',
                }
            ]
        }
    },
    el: {
        'upload-policy': {
            id: 'upload-policy',
            title: 'Πώς να Ανεβάσετε το Πρώτο σας Συμβόλαιο',
            subtitle: 'Ψηφιοποιήστε με ασφάλεια τα ασφαλιστήριά σας σε δευτερόλεπτα χρησιμοποιώντας τον AI σαρωτή μας.',
            readTime: '4 λεπτά',
            category: 'Ξεκινώντας',
            sections: [
                {
                    heading: 'Προετοιμασία',
                    text: 'Πριν ξεκινήσετε, βεβαιωθείτε ότι έχετε ένα καθαρό αντίγραφο PDF ή μια φωτογραφία υψηλής ποιότητας του εγγράφου του ασφαλιστηρίου σας. Η AI μας λειτουργεί καλύτερα με έγγραφα όπου το κείμενο είναι ευανάγνωστο.',
                    note: 'Συμβουλή: Μπορείτε να ανεβάσετε πολλά αρχεία ταυτόχρονα εάν το συμβόλαιό σας καλύπτει πολλά έγγραφα.'
                },
                {
                    heading: 'Βήμα 1: Μετάβαση στο Πορτοφόλι',
                    text: 'Από τον πίνακα ελέγχου, εντοπίστε την καρτέλα "Πορτοφόλι" στο κεντρικό μενού πλοήγησης. Αυτό είναι το κεντρικό σημείο για όλα τα ασφαλιστικά σας περιουσιακά στοιχεία.',
                },
                {
                    heading: 'Βήμα 2: Προσθήκη Νέου Συμβολαίου',
                    text: 'Κάντε κλικ στο μεγάλο πετρόλ κουμπί "Προσθήκη Ασφαλιστήριου". Θα σας παρουσιαστούν δύο επιλογές: "Μεταφόρτωση Εγγράφου" και "Χειροκίνητη Προσθήκη". Επιλέξτε "Μεταφόρτωση Εγγράφου" για την πιο γρήγορη εμπειρία.',
                },
                {
                    heading: 'Βήμα 3: Ανάλυση & Επαλήθευση',
                    text: 'Μόλις μεταφορτωθεί το αρχείο σας, η AI μας θα ξεκινήσει αυτόματα τη σάρωση. Αυτή η διαδικασία διαρκεί συνήθως 10-30 δευτερόλεπτα. Θα δείτε μια κατάσταση "Επεξεργασία".',
                    list: [
                        'Η AI εξάγει το Όνομα της Ασφαλιστικής',
                        'Εντοπίζει τον Αριθμό Συμβολαίου',
                        'Καταγράφει ημερομηνίες κάλυψης και ασφάλιστρα',
                        'Σαρώνει για συγκεκριμένες λεπτομέρειες κάλυψης'
                    ]
                },
                {
                    heading: 'Βήμα 4: Επιβεβαίωση Στοιχείων',
                    text: 'Ελέγξτε τις πληροφορίες που εξαγάγαμε. Ενώ η AI μας είναι εξαιρετικά ακριβής, είναι πάντα καλή πρακτική να ελέγχετε ξανά τις κρίσιμες λεπτομέρειες όπως ημερομηνίες έναρξης/λήξης και ποσά ασφαλίστρων σε σύγκριση με το αρχικό σας έγγραφο. Κάντε κλικ στο "Αποθήκευση" για να ολοκληρώσετε.',
                }
            ]
        },
        'sharing-access': {
            id: 'sharing-access',
            title: 'Κοινοποίηση Πρόσβασης Ασφαλιστήριου',
            subtitle: 'Δώστε ασφαλή, προσωρινή ή μόνιμη πρόσβαση σε μέλη της οικογένειας ή στον ασφαλιστικό σας σύμβουλο.',
            readTime: '2 λεπτά',
            category: 'Συνεργασία',
            sections: [
                {
                    heading: 'Γιατί να Κοινοποιήσετε Πρόσβαση;',
                    text: 'Η κοινοποίηση πρόσβασης είναι κρίσιμη για να διασφαλίσετε ότι οι αγαπημένοι σας έχουν πρόσβαση σε κρίσιμα έγγραφα σε περίπτωση έκτακτης ανάγκης, ή για να επιτρέψετε στον πράκτορά σας να ελέγξει την κάλυψή σας για κενά.',
                },
                {
                    heading: 'Κοινοποίηση με Οικογένεια',
                    text: 'Μεταβείτε στο συμβόλαιο που θέλετε να μοιραστείτε. Κάντε κλικ στο εικονίδιο "Κοινοποίηση". Εισάγετε τη διεύθυνση email του μέλους της οικογένειας. Θα λάβουν έναν ασφαλή σύνδεσμο για να δουν το συμβόλαιο.',
                    note: 'Δεν χρειάζονται πληρωμένο λογαριασμό για να δουν συμβόλαια που μοιράζεστε μαζί τους.'
                },
                {
                    heading: 'Κοινοποίηση με Σύμβουλο',
                    text: 'Εάν συνεργάζεστε με έναν επαγγελματία ασφαλειών, μπορείτε να του παραχωρήσετε "Πρόσβαση Συμβούλου". Αυτό τους επιτρέπει να δουν ολόκληρο το χαρτοφυλάκιό σας και να προτείνουν καλύτερες επιλογές κάλυψης.',
                    list: [
                        'Πλοηγηθείτε στο "Λογαριασμός" -> "Ρυθμίσεις"',
                        'Επιλέξτε "Παραχώρηση Πρόσβασης"',
                        'Επιλέξτε "Επαγγελματίας/Σύμβουλος"',
                        'Εισάγετε το επαγγελματικό τους email'
                    ]
                }
            ]
        },
        'premium-features': {
            id: 'premium-features',
            title: 'Κατανόηση των Premium Προνομίων',
            subtitle: 'Ξεκλειδώστε την πλήρη δύναμη της ανάλυσης AI και απεριόριστο αποθηκευτικό χώρο με το PolicyWallet Premium.',
            readTime: '5 λεπτά',
            category: 'Δυνατότητες',
            sections: [
                {
                    heading: 'Ανάλυση Κενών με AI',
                    text: 'Το βασικό πλεονέκτημα του Premium είναι η εις βάθος ανάλυση. Η AI μας δεν διαβάζει απλώς το συμβόλαιό σας. Το κατανοεί. Συγκρίνει την κάλυψή σας με τα πρότυπα της αγοράς για να βρει "Κενά" - κινδύνους στους οποίους είστε εκτεθειμένοι αλλά όχι καλυμμένοι.',
                },
                {
                    heading: 'Απεριόριστος Αποθηκευτικός Χώρος',
                    text: 'Οι δωρεάν λογαριασμοί περιορίζονται σε 3 ενεργά συμβόλαια. Το Premium σας επιτρέπει να αποθηκεύετε απεριόριστα συμβόλαια, συμπεριλαμβανομένων παλαιών/ληγμένων συμβολαίων για ιστορικό έλεγχο.',
                },
                {
                    heading: 'Προτεραιότητα Υποστήριξης',
                    text: 'Τα μέλη Premium έχουν πρόσβαση στη συνομιλία "Ειδικού Συμβούλου". Πραγματικοί ειδικοί ασφαλειών (όχι bots) είναι διαθέσιμοι για να απαντήσουν σε διάφορες ερωτήσεις σχετικά με την κάλυψή σας ή τη διαδικασία αποζημίωσης.',
                    note: 'Ώρες υποστήριξης: Δευτέρα - Παρασκευή, 9πμ - 6μμ.'
                }
            ]
        },
        'reset-password': {
            id: 'reset-password',
            title: 'Πώς να Επαναφέρετε τον Κωδικό σας',
            subtitle: 'Ανακτήστε την πρόσβαση στον λογαριασμό σας με ασφάλεια.',
            readTime: '1 λεπτό',
            category: 'Λογαριασμός & Ασφάλεια',
            sections: [
                {
                    heading: 'Ξεχάσατε τον Κωδικό;',
                    text: 'Εάν δεν μπορείτε να συνδεθείτε, κάντε κλικ στον σύνδεσμο "Ξεχάσατε τον Κωδικό;" στην οθόνη εισόδου. Εισάγετε την εγγεγραμμένη διεύθυνση email σας.',
                },
                {
                    heading: 'Ελέγξτε το Email σας',
                    text: 'Θα στείλουμε έναν ασφαλή, χρονικά περιορισμένο σύνδεσμο στο email σας. Κάντε κλικ σε αυτόν τον σύνδεσμο εντός 30 λεπτών για να ορίσετε νέο κωδικό.',
                    note: 'Εάν δεν βλέπετε το email, ελέγξτε τον φάκελο ανεπιθύμητων.'
                },
                {
                    heading: 'Αλλαγή Κωδικού από Ρυθμίσεις',
                    text: 'Εάν είστε ήδη συνδεδεμένοι και θέλετε να αλλάξετε τον κωδικό σας για λόγους ασφαλείας, μεταβείτε στο "Λογαριασμός" -> "Ρυθμίσεις" -> "Ασφάλεια" και επιλέξτε "Αλλαγή Κωδικού".'
                }
            ]
        },
        'notifications': {
            id: 'notifications',
            title: 'Διαχείριση Προτιμήσεων Ειδοποιήσεων',
            subtitle: 'Προσαρμόστε πώς και πότε το PolicyWallet επικοινωνεί μαζί σας.',
            readTime: '3 λεπτά',
            category: 'Ρυθμίσεις',
            sections: [
                {
                    heading: 'Τύποι Ειδοποιήσεων',
                    text: 'Στέλνουμε ειδοποιήσεις για κρίσιμα γεγονότα για να σας κρατάμε προστατευμένους.',
                    list: [
                        'Υπενθυμίσεις Ανανέωσης (30, 14 και 3 ημέρες πριν τη λήξη)',
                        'Επιβεβαιώσεις πληρωμής',
                        'Ειδοποιήσεις ασφαλείας (συνδέσεις από νέες συσκευές)',
                        'Αποτελέσματα Ανάλυσης AI'
                    ]
                },
                {
                    heading: 'Προσαρμογή καναλιών',
                    text: 'Οι ειδοποιήσεις έρχονται με email. Αν τις επιτρέψετε στον browser σας, μπορείτε να τις λαμβάνετε και ως push — δεν χρειάζεται εφαρμογή. Μεταβείτε στον Λογαριασμό -> Ρυθμίσεις για να επιλέξετε ποιες θέλετε.',
                }
            ]
        },
        'install-pwa': {
            id: 'install-pwa',
            title: 'Πώς να Εγκαταστήσετε την Εφαρμογή',
            subtitle: 'Αποκτήστε το PolicyWallet στην αρχική σας οθόνη για άμεση πρόσβαση.',
            readTime: '2 λεπτά',
            category: 'Mobile App & PWA',
            sections: [
                {
                    heading: 'Προοδευτική Εφαρμογή Ιστού (PWA)',
                    text: 'Το PolicyWallet είναι μια Προοδευτική Εφαρμογή Ιστού. Αυτό σημαίνει ότι μπορείτε να την εγκαταστήσετε απευθείας από τον browser σας χωρίς να επισκεφτείτε ένα κατάστημα εφαρμογών. Λειτουργεί εκτός σύνδεσης και καταλαμβάνει ελάχιστο χώρο.',
                },
                {
                    heading: 'Εγκατάσταση σε iOS (iPhone/iPad)',
                    text: 'Ανοίξτε το PolicyWallet στο Safari.',
                    list: [
                        'Πατήστε το κουμπί "Κοινοποίηση" (κουτί με βέλος προς τα πάνω)',
                        'Κυλήστε προς τα κάτω και πατήστε "Προσθήκη στην Αρχική Οθόνη"',
                        'Πατήστε "Προσθήκη" στην επάνω δεξιά γωνία'
                    ]
                },
                {
                    heading: 'Εγκατάσταση σε Android',
                    text: 'Ανοίξτε το PolicyWallet στο Chrome.',
                    list: [
                        'Πατήστε το εικονίδιο μενού (τρεις τελείες) επάνω δεξιά',
                        'Πατήστε "Εγκατάσταση Εφαρμογής" ή "Προσθήκη στην Αρχική Οθόνη"',
                        'Ακολουθήστε την οδηγία στην οθόνη'
                    ]
                }
            ]
        },
        'update-payment': {
            id: 'update-payment',
            title: 'Ενημέρωση Μεθόδου Πληρωμής',
            subtitle: 'Διαχειριστείτε με ασφάλεια τα στοιχεία πληρωμής της συνδρομής σας.',
            readTime: '2 λεπτά',
            category: 'Χρεώσεις & Συνδρομές',
            sections: [
                {
                    heading: 'Πρόσβαση στις Ρυθμίσεις Χρέωσης',
                    text: 'Μεταβείτε στο "Λογαριασμός" -> "Χρέωση". Εδώ θα δείτε το τρέχον πλάνο σας και την καταχωρημένη κάρτα.',
                },
                {
                    heading: 'Προσθήκη Νέας Κάρτας',
                    text: 'Κάντε κλικ στο "Προσθήκη Μεθόδου Πληρωμής". Εισάγετε τα στοιχεία της νέας σας κάρτας. Υποστηρίζουμε Visa, Mastercard και American Express. Τα δεδομένα της κάρτας σας κρυπτογραφούνται και διαχειρίζονται από τη Stripe.',
                },
                {
                    heading: 'Ορισμός ως Προεπιλογή',
                    text: 'Μόλις προστεθεί, κάντε κλικ στις τρεις τελείες δίπλα στη νέα σας κάρτα και επιλέξτε "Ορισμός ως Προεπιλογή". Το επόμενο τιμολόγιό σας θα χρεωθεί σε αυτήν την κάρτα.',
                }
            ]
        }
    }
}
