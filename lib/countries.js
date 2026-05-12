(function () {
window.GeoMaster = window.GeoMaster || {};

const countryNames = ['Lebanon', 'Mauritius', 'Nauru', 'Dominica', 'Bulgaria', 'Azerbaijan', 'Guadeloupe', 'United States Virgin Islands', 'Paraguay', 'Cuba', 'Argentina', 'Sweden', 'Bermuda', 'Croatia', 'Macedonia', 'Mauritania', 'France', 'Burkina Faso', 'Turks and Caicos Islands', 'Jamaica', 'Chile', 'Guinea-Bissau', 'Austria', 'Western Sahara', 'Togo', 'Saudi Arabia', 'Uruguay', 'Portugal', 'Tajikistan', 'Cameroon', 'Sint Maarten', 'Qatar', 'Mexico', 'Marshall Islands', 'Trinidad and Tobago', 'Botswana', 'Fiji', 'Greece', 'Palestine', 'Ireland', 'Cyprus', 'South Africa', 'Reunion', 'Haiti', 'Benin', 'Cayman Islands', 'Greenland', 'Montenegro', 'Pakistan', 'Guyana', 'Panama', 'Saint-Barthelemy', 'South Sudan', 'Kyrgyzstan', 'Bosnia and Herzegovina', 'Burundi', 'Estonia', 'Vanuatu', 'Switzerland', 'Costa Rica', 'Chad', 'Suriname', 'Saba (Netherlands)', 'Ecuador', 'Palau', 'Afghanistan', 'Norway', 'Romania', 'Canada', 'Rwanda', 'Belize', 'Bangladesh', 'Zambia', 'United States', 'Malta', 'St. Eustatius (Netherlands)', 'Syria', 'Saint Kitts and Nevis', 'Bahrain', 'Nigeria', 'Sao Tome and Principe', 'Moldova', 'Gabon', 'Falkland Islands', 'India', 'Saint Lucia', 'China', 'Federated States of Micronesia', 'American Samoa', 'Slovenia', 'United Arab Emirates', 'Bolivia', 'Senegal', 'Japan', 'Namibia', 'Sudan', 'Iran', 'Serbia', 'Guinea', 'Belarus', 'Turkmenistan', 'South Korea', 'Papua New Guinea', 'Cambodia', 'Nicaragua', 'Venezuela', 'Bahamas', 'Uzbekistan', 'Northern Mariana Islands', 'Grenada', 'Curacao', "Lao People's Democratic Republic", 'Antigua and Barbuda', 'Tanzania', 'Eritrea', 'Ethiopia', 'Seychelles', 'Madagascar', 'British Virgin Islands', 'Yemen', 'Kazakhstan', 'French Polynesia', 'Republic of Congo', "Cote d'Ivoire", 'Morocco', 'Timor-Leste', 'Guam', 'Indonesia', 'Albania', 'Israel', 'Spain', 'Democratic Republic of the Congo', 'Philippines', 'Netherlands', 'Belgium', 'Ghana', 'Vietnam', 'French Guiana', 'Brazil', 'Tuvalu', 'Jordan', 'Iceland', 'Australia', 'Germany', 'Dominican Republic', 'Libya', 'Mozambique', 'Niger', 'Zimbabwe', 'Sri Lanka', 'Georgia', 'Oman', 'Ukraine', 'Barbados', 'Finland', 'Malawi', 'Guatemala', 'Czech Republic', 'Poland', 'Saint Vincent and the Grenadines', 'Aruba', 'Kosovo', 'Myanmar', 'Egypt', 'Faeroe Islands', 'Slovakia', 'Maldives', 'Armenia', 'Turkey', 'Denmark', 'Somalia', 'Algeria', 'Solomon Islands', 'Mali', 'Tunisia', 'El Salvador', 'Italy', 'Comoros', 'Cape Verde', 'Saint-Martin', 'Brunei', 'Equatorial Guinea', 'New Zealand', 'Samoa', 'Mayotte', 'Iraq', 'Malaysia', 'Honduras', 'Peru', 'Thailand', 'Djibouti', 'Luxembourg', 'Montserrat', 'Lesotho', 'Uganda', 'Lithuania', 'New Caledonia', 'Taiwan', 'Hungary', 'Latvia', 'North Korea', 'Kuwait', 'Nepal', 'Anguilla', 'Mongolia', 'Colombia', 'Puerto Rico', 'Canary Islands (Spain)', 'Tonga', 'Swaziland', 'Angola', 'Russia', 'Sierra Leone', 'Martinique', 'United Kingdom', 'Kenya', 'Liberia', 'The Gambia', 'Central African Republic', 'Bhutan'];

const countriesDiff1 = ['France', 'Mexico', 'United Kingdom', 'Russia', 'Italy', 'Greenland', 'Canada', 'United States', 'Iceland', 'Spain', 'Australia', 'Germany', 'India', 'China', 'Japan', 'South Korea'];

const countriesDiff2 = ['Sweden', 'Egypt', 'Austria', 'New Zealand', 'North Korea', 'Denmark', 'Norway', 'Turkey', 'Madagascar', 'Romania', 'Brazil', 'Ukraine', 'Finland', 'Saudi Arabia', 'Philippines', 'Netherlands', 'Belgium', 'Switzerland', 'Pakistan', 'Indonesia', 'Israel', 'Portugal', 'Qatar', 'Greece', 'Palestine', 'Ireland', 'South Africa'];

const countriesDiff3 = ['Bulgaria', 'Uruguay', 'Kenya', 'Central African Republic', 'Malaysia', 'Hungary', 'Colombia', 'Nepal', 'Kuwait', 'Taiwan', 'Peru', 'Thailand', 'Syria', 'Iraq', 'Somalia', 'Algeria', 'Morocco', 'Slovakia', 'Uganda', 'Maldives', 'Armenia', 'Vietnam', 'Albania', 'Poland', 'Georgia', 'Dominican Republic', 'Libya', 'Uzbekistan', 'Venezuela', 'Bahamas', 'Papua New Guinea', 'Nigeria', 'Iran', 'Moldova', 'United Arab Emirates', 'Afghanistan', 'Bangladesh',  'Azerbaijan', 'Cyprus', 'Paraguay', 'Cuba', 'Argentina', 'Jamaica', 'Chile', 'Sudan'];

const countriesDiff4 = ['Reunion', 'Montenegro', 'Tanzania', 'Liberia', 'The Gambia', 'Tonga', 'Swaziland', 'Angola', 'Ghana', 'Puerto Rico', 'Canary Islands (Spain)', 'Honduras', 'Latvia',  'Anguilla', 'Mongolia', 'Djibouti', 'Luxembourg', 'Montserrat', 'Lesotho', 'Lithuania', 'New Caledonia', 'Cambodia', 'Solomon Islands', 'Mali', 'Tunisia', 'El Salvador', 'Oman', 'Czech Republic', 'British Virgin Islands', 'Mozambique', 'Niger', 'Zimbabwe', 'Sri Lanka', 'Yemen', 'Kazakhstan', 'French Polynesia', 'Republic of Congo', 'Nicaragua', 'Estonia', 'Gabon', 'Senegal', 'Namibia', 'Serbia', 'Vanuatu', 'Turkmenistan', 'Guinea', 'Bolivia', 'Belarus', 'Slovenia', 'Costa Rica', 'Zambia', 'Chad', 'Suriname', 'Haiti', 'Lebanon', 'South Sudan', 'Kyrgyzstan', 'Tajikistan', 'Cameroon', 'Mauritius', 'Nauru', 'Dominica', 'Guadeloupe', 'Togo', 'United States Virgin Islands', 'Bermuda', 'Croatia', 'Macedonia', 'Mauritania'];

const countriesDiff5 = ['Turks and Caicos Islands', 'Bahrain', 'Bhutan', 'Sierra Leone', 'Martinique', 'Faeroe Islands', 'Samoa', 'Mayotte', 'Comoros', 'Cape Verde', 'Saint-Martin', 'Brunei', 'Equatorial Guinea', 'Timor-Leste', 'Tuvalu', 'Jordan', 'Barbados', 'Malawi', 'Guatemala', 'Saint Vincent and the Grenadines', 'Aruba', 'Kosovo', 'Myanmar', 'Guam', 'French Guiana', 'Democratic Republic of the Congo', 'Falkland Islands', "Cote d'Ivoire", 'Eritrea', 'Ethiopia', 'Seychelles', 'Federated States of Micronesia', 'Northern Mariana Islands', 'Grenada', 'Curacao', "Lao People's Democratic Republic", 'Antigua and Barbuda', 'American Samoa', 'Saint Lucia', 'Sao Tome and Principe', 'Saba (Netherlands)', 'Malta', 'Saint Kitts and Nevis', 'Rwanda', 'St. Eustatius (Netherlands)', 'Belize', 'Ecuador', 'Palau', 'Botswana', 'Guyana', 'Panama', 'Saint-Barthelemy', 'Bosnia and Herzegovina', 'Burundi', 'Fiji', 'Benin', 'Cayman Islands', 'Burkina Faso', 'Guinea-Bissau', 'Western Sahara', 'Sint Maarten', 'Marshall Islands', 'Trinidad and Tobago'];

const difficultyBuckets = {
  diff1: countriesDiff1,
  diff2: countriesDiff2,
  diff3: countriesDiff3,
  diff4: countriesDiff4,
  diff5: countriesDiff5,
};

window.GeoMaster.countries = {
  countryNames,
  countriesDiff1,
  countriesDiff2,
  countriesDiff3,
  countriesDiff4,
  countriesDiff5,
  difficultyBuckets,
};


})();

