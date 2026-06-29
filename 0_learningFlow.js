const { get } = require("http");

let swe18 = `IELP 1		compulsory	0.1
IELP 2	IELP 1	compulsory	0.1
IELP 3	IELP 2	compulsory	0.1
IELP 4	IELP 3	compulsory	0.1
IELP 5	IELP 4	compulsory	0.1
IELP 6	IELP 5	compulsory	0.1
POLS 130		compulsory	1.1
POLS 131		compulsory	1.2
POLS 132		compulsory	1.2
LAWS 121		compulsory	1.3
MATH 101		compulsory	2.1
MATH 102	MATH 101, MATH 103 compulsory 2.2
MATH 201	MATH 102, MATH 103 compulsory 2.3
MATH 202	MATH 201	compulsory	3.1
MATH 203	MATH 202	compulsory	3.3
MATH 204	MATH 102	compulsory	3.3
MATH 103	compulsory	2.1
MATH 301	MATH 103 compulsory 3.3
PHYS 201	MATH 201	compulsory	3.1
PHYS 202	PHYS 201	compulsory	3.1
PHYS 203	PHYS 202	compulsory	3.3
CSE 101	compulsory	1.3
CSE 102	compulsory	2.1
CSE 106	compulsory	2.2
CSE 202	CSE 106	compulsory	3.2
CSE 203	CSE 102	compulsory	2.2
CSE 201	CSE 102	compulsory	2.3
CSE 202 CSE 106	compulsory	3.2
CSE 301	CSE 106	compulsory	3.1
CSE 204	CSE 101	compulsory	2.2
CSE 205 CSE 204	compulsory	2.3
CSE 206	CSE 101	compulsory	2.3
CSE 302	CSE 206	compulsory	3.1
CSE 303	CSE 201, CSE 202	compulsory	3.3
CSE 205	CSE 204	compulsory	2.3
CSE 107	CSE 101	compulsory	2.1
CSE 306	CSE 442 CSE 204	compulsory	4.3
CSE 305	CSE 203	compulsory	4.1
CSE 307	CSE 102	compulsory	3.2
CSE 442	CSE 305, CSE 301	compulsory	4.2
CSE 443	CSE 203, CSE 301	compulsory	3.3
CSE 441	CSE 203	compulsory	4.1
CSE 453	CSE 305	compulsory	4.2
CSE 422	CSE 305	compulsory	4.2
CSE 310	CSE 203	compulsory	4.1
CSE 311	CSE 310	compulsory	4.2
EBS 401 compulsory 4.3
EBS 405 genelective2	4.2
EBS 407 genelective2    4.2
EBS 410 EBS 401, EBS 405 genelective2	5.1
EBS 420 genelective2	3.1
EBS 415 compulsory 5.1
CSE 483	CSE 203	elective	4.3
CSE 454	CSE 102	elective	4.3
CSE 456	CSE 102	elective	4.3
CSE 431	CSE 203	elective	4.3
CSE 432	CSE 201, CSE 203	elective 4.3
CSE 434	CSE 441	elective	4.3
CSE 470	CSE 302, CSE 204	elective 4.3
CSE 481	CSE 305, CSE 470	elective	4.3
CSE 482	CSE 307	elective	4.3
CSE 449	CSE 202	elective	4.3
CSE 457	CSE 203	elective	4.3
CSE 450	CSE 303	elective	4.3
CSE 455	CSE 101	elective	4.3
CSE 410	CSE 311	compulsory	4.3
CSE 491	CSE 410, CSE 311	compulsory	5.1
CSE 492	CSE 491	compulsory	5.2
CSE 493	CSE 492	compulsory	5.3`;


let swe21 = `IELP 1		compulsory	0.1
IELP 2	IELP 1	compulsory	0.1
IELP 3	IELP 2	compulsory	0.1
IELP 4	IELP 3	compulsory	0.1
IELP 5	IELP 4	compulsory	0.1
IELP 6	IELP 5	compulsory	0.1
POLS 130		compulsory	1.1
POLS 131		compulsory	1.2
POLS 132		compulsory	1.2
LAWS 121		compulsory	1.3
MATH 101		compulsory	2.1
MATH 102		compulsory	2.2
MATH 201	MATH 102	compulsory	2.3
MATH 202	MATH 201	compulsory	3.1
MATH 203	MATH 202	compulsory	3.3
MATH 204	MATH 102	compulsory	3.3
MATH 103		compulsory	2.1
MATH 301	MATH 103	compulsory	3.3
PHYS 201		compulsory	3.1
PHYS 202	PHYS 201	compulsory	3.1
PHYS 203	PHYS 202	compulsory	3.3
EBS 401		compulsory	3.3
EBS 405		compulsory	3.3
EBS 410	EBS 401, EBS 405	genelective2	3.1
EBS 415	EBS 401, EBS 405	genelective2	3.1
EBS 420	EBS 401, EBS 405	genelective2	3.1
CSE 106	MATH 101	compulsory	2.2
CSE 202	CSE 201	compulsory	3.1
CSE 101		compulsory	1.3
CSE 102		compulsory	2.1
CSE 203	CSE 102	compulsory	2.2
CSE 201	CSE 102	compulsory	2.3
CSE 301	CSE 106	compulsory	3.1
CSE 204	CSE 101	compulsory	2.2
CSE 206	CSE 101	compulsory	2.3
CSE 302	CSE 204	compulsory	3.1
CSE 303	CSE 201, CSE 202	compulsory	3.1
CSE 205	CSE 204	compulsory	2.3
CSE 107		compulsory	2.1
CSE 306	CSE 204	compulsory	4.3
CSE 305	CSE 203	compulsory	4.1
CSE 307	CSE 102	compulsory	3.2
CSE 442	CSE 305	compulsory	4.2
CSE 443	CSE 203	compulsory	4.3
CSE 441	CSE 203	compulsory	4.1
CSE 453	CSE 305	compulsory	4.2
CSE 422	CSE 305	compulsory	4.2
CSE 310	CSE 203	compulsory	4.1
CSE 311	CSE 310	compulsory	4.2
CSE 483	CSE 203	elective	4.3
CSE 454	CSE 204	elective	4.3
CSE 456	CSE 205	elective	4.3
CSE 431	CSE 206	elective	4.3
CSE 432	CSE 207	elective	4.3
CSE 434	CSE 208	elective	4.3
CSE 470	CSE 209	elective	4.3
CSE 482	CSE 210	elective	4.3
CSE 449	CSE 211	elective	4.3
CSE 457	CSE 212	elective	4.3
CSE 450	CSE 213	elective	4.3
CSE 455	CSE 214	elective	4.3
CSE 456	CSE 215	elective	4.3
CSE 458	CSE 216	elective	4.3
CSE 459	CSE 217	elective	4.3
CSE 410	CSE 311	compulsory	3.4
CSE 491	CSE 410	compulsory	4.1
CSE 492	CSE 491	compulsory	4.2
CSE 493	CSE 492	compulsory	4.3`;

let swe23 = `IELP 1		compulsory	0.1
IELP 2	IELP 1	compulsory	0.1
IELP 3	IELP 2	compulsory	0.1
IELP 4	IELP 3	compulsory	0.1
IELP 5	IELP 4	compulsory	0.1
IELP 6	IELP 5	compulsory	0.1
POLS 133		compulsory	1.1
LAWS 122		compulsory	1.1
MATH 103		compulsory	1.1
POLS 134		compulsory	1.2
MATH 111		compulsory	1.2
CSE 100		compulsory	1.2
CSE 106	MATH 103	compulsory	1.2
POLS 135		compulsory	1.3
MATH 112	MATH 111	compulsory	1.3
CSE 103	CSE 100	compulsory	1.3
POLS 132		compulsory	2.1
MATH 113	MATH 112	compulsory	2.1
CSE 104	CSE 103	compulsory	2.1
CSE 204	CSE 100	compulsory	2.1
POLS 136		compulsory	2.2
MATH 122 	MATH 113	compulsory	2.2
CSE 203	CSE 104	compulsory	2.2
CSE 201	CSE 104	compulsory	2.2
STAT 101	MATH 111/MATH 103	compulsory	2.3
CSW 303	CSE 201	compulsory	2.3
CSE 206	CSE 100	compulsory	2.3
PHYS 101		compulsory	3.1
CSW 304	CSE 201	compulsory	3.1
CSW 307	CSW 303	compulsory	3.1
CSE 301	CSE 201	compulsory	3.1
PHYS 102	PHYS 101	compulsory	3.2
CSW 309	CSE 301, CSW 303	compulsory	3.2
CSE 202	CSE 201	compulsory	3.2
CSW 306	CSE 301	compulsory	3.2
CSW 304		compulsory	3.2
CSE 302	CSE 206	compulsory	3.3
CSW 315	CSE 201, CSE 106	compulsory	3.3
CSW 400	CSW 306, CSW 309	compulsory	3.4
CSW 405	CSW 303	compulsory	4.1
CSW 406	CSW 303	compulsory	4.1
CSW 480	CSW 306, CSW 309	compulsory	4.1
CSW 481	CSW 480	compulsory	4.2
CSW 482	CSW 481	compulsory	4.3
CSW 430	CSE 201, CSE 203	elective	4.1
CSW 434	CSW 430	elective	4.1
CSW 433	CSW 304	elective	4.1
CSW 437	CSW 304	elective	4.1
CSW 436	CSE 301	elective	4.1
CSW 431	CSW 306	elective	4.1
CSW 435		elective	4.1
CSW 310	CSE 202	elective	4.1
CSW 432	CSW 405	elective	4.1
CSW 438	CSW 303	elective	4.1
CSW 439	CSE 201	elective	4.1
CSW 440	CSE 204	elective	4.1
CSW 330	CSE 201	elective	4.1
CSW 331	CSE 201	elective	4.1
CSW 332	CSE 201	elective	4.1
CSW 333	CSE 103	elective	4.1
CSN 305	CSE 204	elective	4.1
PSYC 154	4(4,0)	genelective2	2.3
SOC 144	4(4,0)	genelective2	2.3
BUS 101	IELTS 6.0	genelective2	2.3
ECO 110		genelective2	2.3
FIN 239	IELTS 6.0	genelective2	2.3
IEPS 100		genelective2	2.3
MATH 114	MATH 113	genelective3	3.3
MTH 171		genelective3	3.3
MATH 123	MATH 103, MATH 122	genelective3	3.3
MATH 104		genelective3	3.3
PHYS 103	PHYS 102	genelective3	3.3
CHEM 100		genelective3	3.3
STAT 202		genelective3	3.3
INFO 101		genelective4	1.1
INFO 106		genelective4	1.1
INFO 201		genelective4	1.1
DSCI 130		genelective4	1.1
DSCI 261	STAT 202	genelective4	1.1
WRT 122		genelective5	1.2
WRT 187		genelective5	1.2
COMS 101		genelective5	1.2
PHL 255		genelective5	1.2
MUSI 110		genelective5	1.2
UNIV 111		genelective6	1.3
UNIV 112		genelective6	1.3
UNIV 226 		genelective6	1.3
MGMT 291 		genelective6	1.3`;

let cndc18 = `IELP 1		compulsory	0.1
IELP 2	IELP 1	compulsory	0.1
IELP 3	IELP 2	compulsory	0.1
IELP 4	IELP 3	compulsory	0.1
IELP 5	IELP 4	compulsory	0.1
IELP 6	IELP 5	compulsory	0.1
POLS 130		compulsory	1.1   
POLS 131		compulsory	1.2   
POLS 132		compulsory	1.2   
LAWS 121		compulsory	1.3
CSE 101		compulsory	1.3
MATH 103		compulsory	1.3
MATH 101		compulsory	2.1
CSE 102	CSE 101 	compulsory  	2.1
CSE 106 	MATH 103    	compulsory	2.1
CSE 203	CSE 102	compulsory	2.2
MATH 102        	MATH 101	compulsory	2.2
CSE 204	CSE 101 	compulsory	2.2
CSE 201	CSE 102 	compulsory	2.3
MATH 201	MATH 102, MATH 103   	compulsory	2.3
CSE 206	CSE 101	compulsory	2.3
CSE 205	CSE 204	compulsory	2.3
CSE 301	CSE 106	compulsory	3.1
CSE 302	CSE 206	compulsory	3.1
MATH 202	MATH 201    	compulsory	3.1
PHYS 201		compulsory	3.1
MATH 203	MATH 202    	compulsory	3.2
CSE 202	CSE 106	compulsory	3.2
PHYS 202	PHYS 201    	compulsory	3.2
CSE 307	CSE 102	compulsory	3.2
MATH 204	MATH 102, MATH 103	compulsory	3.3
CSE 470	CSE 204, CSE 302	compulsory	3.3
PHYS 203	PHYS 202   	compulsory	3.3
CSE 303	CSE 201, CSE 202	compulsory	3.3
MATH 301	MATH 202    	compulsory	4.1
CSE 476	CSE 204, CSE 302	compulsory	4.1
CSE 320  	CSE 205    	compulsory	4.1
CSE 305	CSE 203	compulsory	4.1
CSE 321 	CSE 320 	compulsory 	4.2
EBS 405		compulsory 	4.2
CSE 462  	CSE 205    	compulsory 	4.2
CSE 477     	CSE 204, CSE 302	compulsory 	4.2
EBS 401		compulsory	4.3
CSE 306	CSE 204, CSE 102	compulsory	4.3
CSE 469	CSE 204	compulsory	4.3
CSE 420 	CSE 321 	compulsory 	4.4
EBS 415	EBS 401, EBS 405	compulsory	5.1
CSE 494	CSE 321, CSE 420, MATH 301	compulsory	5.1
CSE 495	CSE 494	compulsory	5.2
CSE 496	CSE 495	compulsory	5.3
CSE 460	CSE 204, CSE 302	elective	5.1
CSE 461	CSE 204, CSE 302	elective	5.1
CSE 487	CSE 204, CSE 302	elective	5.1
CSE 488	MATH 301, MATH 201	elective	5.1
CSE 468	CSE 205	elective	5.1
CSE 489	CSE 205	elective	5.2
CSE 490	MATH 301 MATH 201	elective	5.2
CSE 484	CSE 204	elective	5.2
CSE 485	CSE 204	elective	5.2
CSE 486	CSE 204	elective	5.3
CSE 479 	CSE 204	elective	5.3
CSE 480 	CSE 204	elective	5.3
CSE 467 	CSE 461	elective	5.3
CSE 465 	CSE 204	elective	5.3`;

let cndc21 = `IELP 1		compulsory	0.1
IELP 2	IELP 1	compulsory	0.1
IELP 3	IELP 2	compulsory	0.1
IELP 4	IELP 3	compulsory	0.1
IELP 5	IELP 4	compulsory	0.1
IELP 6	IELP 5	compulsory	0.1
POLS 133		compulsory	1.1
POLS 134		compulsory	1.1
POLS 135		compulsory	1.2
POLS 136		compulsory	1.2
POLS 132		compulsory	1.3
LAWS 121		compulsory	1.3
CSE 101		compulsory	1.3
MATH 101		compulsory	2.1
MATH 103		compulsory	2.1
CSE 102	CSE 101	compulsory	2.1
CSE 204	CSE 101	compulsory	2.1
MATH 102	MATH 101	compulsory	2.2
CSE 203	CSE 102	compulsory	2.2
CSE 106 	MATH 103	compulsory	2.2
MATH 201    	MATH 102, MATH 103	compulsory	2.3
CSE 201	CSE 102	compulsory	2.3
CSE 205	CSE 204	compulsory	2.3
CSE 206	CSE 101	compulsory	2.3
MATH 202	MATH 201	compulsory	3.1
PHYS 201		compulsory	3.1
CSE 301	CSE 106	compulsory	3.1
CSE 302	CSE 206	compulsory	3.1
MATH 203	MATH 202	compulsory	3.2
PHYS 202	PHYS 201	compulsory	3.2
CSE 307	CSE 102	compulsory	3.2
CSE 202	CSE 106	compulsory	3.2
MATH 204	MATH 102, MATH 103	compulsory	3.3
PHYS 203	PHYS 202	compulsory	3.3
CSE 303	CSE 201, CSE 202	compulsory	3.3
CSE 470	CSE 302, CSE 204	compulsory	3.3
MATH 301	MATH 202	compulsory	4.1
CSE 305	CSE 203	compulsory	4.1
CSE 476	CSE 204 CSE 302	compulsory	4.1
CSE 320	CSE 205	compulsory	4.1
CSE 462	CSE 205	compulsory	4.2
CSE 477	CSE 204 CSE 302	compulsory	4.2
CSE 321	CSE 320	compulsory	4.2
CSE 306	CSE 204, CSE 102	compulsory	4.3
EBS 401		compulsory	4.3
CSE 469	CSE 204	compulsory	4.3
CSE 420	CSE 321	compulsory	4.4
EBS 405		compulsory	5.1
EBS 410	EBS 401, EBS 405	genelective2	5.2
EBS 415	EBS 401, EBS 405	genelective2	5.2
EBS 420	EBS 401, EBS 405	genelective2	5.2
CSE 494	CSE 321, CSE 420	compulsory	5.1
CSE 495	CSE 494	compulsory	5.2
CSE 496	CSE 495	compulsory	5.3
CSE 449	CSE 202	elective	5.1
CSE 460	CSE 204, CSE 302	elective	5.1
CSE 461	CSE 204, CSE 302	elective	5.1
CSE 465	CSE 204	elective	5.1
CSE 468	CSE 205	elective	5.1
CSE 479	CSE 204	elective	5.1
CSE 480	CSE 204	elective	5.1
CSE 484	CSE 204	elective	5.1
CSE 485	CSE 204	elective	5.1
CSE 486	CSE 204	elective	5.1
CSE 487	CSE 204, CSE 302	elective	5.1
CSE 489	CSE 205	elective	5.1
CSE 490	MATH 301, MATH 201	elective	5.1`;

let cndc23 = `IELP 1		compulsory	0.1
IELP 2	IELP 1	compulsory	0.1
IELP 3	IELP 2	compulsory	0.1
IELP 4	IELP 3	compulsory	0.1
IELP 5	IELP 4	compulsory	0.1
IELP 6	IELP 5	compulsory	0.1
POLS 133		compulsory	1.1
LAWS 122		compulsory	1.1
MATH 111		compulsory	1.1
ANT 110         		genelective1	1.1
CIVI 101       		genelective1	1.1
PSYC 154        		genelective1	1.1
SOC 144         		genelective1	1.1
POLS 134		compulsory	1.2
MATH 112   	MATH 111 	compulsory	1.2
MATH 103          		compulsory	1.2
CSE 100         		compulsory	1.2
POLS 135		compulsory	1.3
STAT 101    	MATH 103 	compulsory	1.3
CSE 106      	MATH 103	compulsory	1.3
CSE 204      	CSE 100	compulsory	1.3
POLS 132		compulsory	2.1
CSN 205    	CSE 204	compulsory 	2.1
WRT 122        		genelective3	2.1
WRT 187         		genelective3	2.1
PHL 255         		genelective3	2.1
LNGS - C101         	IELP 6 	genelective3	2.1
LNGS - C102     	LNGS - C101	genelective3	2.1
LNGS - C103    	LNGS - C102 	genelective3	2.1
LNGS - J101     	IELP 6     	genelective3	2.1
LNGS - J102   	LNGS - J101  	genelective3	2.1
LNGS - J103 	LNGS - J102    	genelective3	2.1
LNGS - K101        	IELP 6  	genelective3	2.1
LNGS - K102     	LNGS - K101	genelective3	2.1
LNGS - K103   	LNGS - K102  	genelective3	2.1
MUSI 110 		genelective3	2.1
MUSI 203      		genelective3	2.1
MUSI 204 		genelective3	2.1
MUSI 205 		genelective3	2.1
ART 101    		genelective3	2.1
BUS 101 	IELP 6 	genelective1	2.1
EBS 110         		genelective1	2.1
ECO 110         		genelective1	2.1
FIN 239   	IELP 6	genelective1	2.1
IEPS 100        		genelective1	2.1
IREL 101        		genelective1	2.1
POLS 136		compulsory	2.2
CSE 103	CSE 100	compulsory 	2.2
COMS 101 		compulsory	2.2
INFO 101        		genelective2	2.2
INFO 106        		genelective2	2.2
INFO 201        		genelective2	2.2
DSCI 130        		genelective2	2.2
ECE 106         		genelective2	2.2
PHYS 100		compulsory 	2.3
CSE 104	CSE 103 	compulsory	2.3
CSE 206      	CSE 100	compulsory	2.3
MGMT 291        		genelective4	2.3
UNIV 111   		genelective4	2.3
UNIV 112      		genelective4	2.3
UNIV 226    		genelective4	2.3
MGMT 291    		genelective4	2.3
HLTH 130		genelective4	2.3
PSYC 110		genelective4	2.3
UNIV 101		genelective4	2.3
CSE 201     	CSE 104 	compulsory	3.1
CSE 302     	CSE 206	compulsory	3.1
CSN 301     	CSN 205	compulsory	3.1
CSN 302     	CSE 103, CSE 204	compulsory	3.1
CSN 303     	CSE 204 	compulsory	3.2
CSN 305     	CSN 205	compulsory	3.2
CSE 203     	CSE 104 	compulsory	3.2
CSE 301      	CSE 201	compulsory	3.2
CSN 304      	CSN 303	compulsory	3.3
CSN 306      	CSN 205, CSE 302	compulsory	3.3
CSW 304      	CSE 201	compulsory	3.3
CSN 340      	CSN 301, CSN 302, CSN 303	compulsory	3.3
CSN 341      	CSN 340	compulsory	3.4
CSN 401     	CSN 303	compulsory	4.1
CSN 494      	CSN 341	compulsory	4.1
CSW 435             		compulsory	4.2
CSN 495     	CSN 494	compulsory	4.2
CSN 496     	CSN 495 	compulsory	4.3
CSN 404-QTM	CSN 205 	elective	4.1
CSN 406-QTM	CSN 306 	elective	4.2
CSN 405-ANM	CSE 103, CSN 205	elective	4.1
CSN 402-ANM	CSN 303	elective	4.2
CSW 330-IOT	CSE 201 	elective	4.1
CSN 407-IOT	CSN 302	elective	4.2
CSN 403	CSN 401	elective	4.1
CSW 303	CSE 201	elective	4.1
CSW 306	CSE 301, CSW 304 	elective	4.1
CSW 430	CSE 301, CSW 304	elective	4.2
CSN 408	CSE 301, CSN 205	elective	4.2
CSN 409	CSN 205	elective	4.2
CSN 410	CSN 303 	elective	4.3
CSW 332	CSE 201 	elective	4.3`;

let trim = (str) => (str || '').trim();

var parseProgram = (text) => text.split('\n').map(courseText => {
    let parts = courseText.split('\t');
    let course = {
        code: trim(parts[0]),
        pre_req: trim(parts[1]),
        type: trim(parts[2]),
        semester: trim(parts[3])
    }
    course.pre_req = course.pre_req.split(/[\/\|]/g).map(list => list.trim()).filter(list => list)
        .map(list => list.split(',').map(trim).filter(c => c));
    course.pre_req = course.pre_req.filter(list => list.length > 0);
    return course;
});




const program = {
    'swe18': {
        courses: parseProgram(swe18),
        courseMap: {},
        programReqs: {
            compulsory: 45,
            elective: 6,
            genelective2: 1
        }
    },
    'swe21': {
        courses: parseProgram(swe21),
        courseMap: {},
        programReqs: {
            compulsory: 50, // Not important because 
            elective: 5,
            genelective2: 1,
        }
    },
    'swe23': {
        courses: parseProgram(swe23),
        courseMap: {},
        programReqs: {
            compulsory: 40,
            elective: 4,
            genelective2: 1,
            genelective3: 2,
            genelective4: 1,
            genelective5: 1,
            genelective6: 1
        }
    },
    'cndc18': {
        courses: parseProgram(cndc18),
        courseMap: {},
        programReqs: {
            compulsory: 45,
            elective: 5,
        }
    },
    'cndc21': {
        courses: parseProgram(swe21),
        courseMap: {},
        programReqs: {
            compulsory: 51, // Not important because 
            elective: 6,
            genelective2: 1
        }
    }
    ,
    'cndc23': {
        courses: parseProgram(cndc23),
        courseMap: {},
        programReqs: {
            compulsory: 37, // Not important because 
            elective: 5,
            genelective1: 2,
            genelective2: 1,
            genelective3: 1,
            genelective4: 1,
        }
    }
    
};

program['swe23'].courses.forEach(course => program['swe23'].courseMap[course.code] = course);
program['swe21'].courses.forEach(course => program['swe21'].courseMap[course.code] = course);
program['swe18'].courses.forEach(course => program['swe18'].courseMap[course.code] = course);

program['cndc23'].courses.forEach(course => program['cndc23'].courseMap[course.code] = course);
program['cndc21'].courses.forEach(course => program['cndc21'].courseMap[course.code] = course);
program['cndc18'].courses.forEach(course => program['cndc18'].courseMap[course.code] = course);
// For temporary

program['cndc23'] = program['swe23'];

function getSuggestedCourses(completedCourses, nSuggest, major, cohort, availableCourses) {
    cohort = major + (cohort >= '2023' ? '23' : '21');

    if (!program[cohort]) {
        let debugBreakPoint = true;
    }

    let courses = program[cohort].courses;
    let courseMap = program[cohort].courseMap;

    completedCourses = completedCourses || [];
    nSuggest = nSuggest || 6;
    availableCourses = availableCourses || courses.map(c => c.code);
    let availableCoursesMap = {};
    availableCourses.forEach(course => availableCoursesMap[course] = true);

    let completeMap = {};
    let reqs = { ...program[cohort].programReqs };

    completedCourses.forEach(course => {
        completeMap[course] = true;
        if (course != getEquivalentCourse(course)) completeMap[getEquivalentCourse(course)] = true;
        if (!courseMap[course]) {
            return;
        }
        let courseType = courseMap[course].type;
        reqs[courseType]--;
    });

    if (completeMap['IELP 9'] || completeMap['IELP 9.0'] || completeMap['IELP 8.5'] || completeMap['IELP 8'] || completeMap['IELP 8.0'] || completeMap['IELP 7.5'] || completeMap['IELP 7'] || completeMap['IELP 7.0'] || completeMap['IELP 6.5'] || completeMap['IELP 6.0']) completeMap['IELP 6'] = true;
    if (completeMap['IELP 6']) completeMap['IELP 5'] = true;
    if (completeMap['IELP 5']) completeMap['IELP 4'] = true;
    if (completeMap['IELP 4']) completeMap['IELP 3'] = true;
    if (completeMap['IELP 3']) completeMap['IELP 2'] = true;
    if (completeMap['IELP 2']) completeMap['IELP 1'] = true;

    const candidateCourses = courses.filter(c => !completeMap[c.code] && availableCoursesMap[c.code]);
    candidateCourses.sort((c1, c2) => c1.semester.localeCompare(c2.semester));

    let suggestedCourses = [];
    for (const candidateCourse of candidateCourses) {
        if (candidateCourse.type != 'compulsory' && reqs[candidateCourse.type] <= 0) continue;

        if (candidateCourse.pre_req.length === 0 || candidateCourse.pre_req.some(list => list.every(c => completeMap[c]))) {
            suggestedCourses.push(candidateCourse);
            reqs[candidateCourse.type]--;
        }
    }
    // Check if IELP courses are in the suggested list
    const ielp_fourSuject = ['IELP 1', 'IELP 2', 'IELP 3', 'IELP 4'];
    const ielp_threeSuject = ['IELP 5', 'IELP 6'];
    const hasFourSubjectIELP = suggestedCourses.some(course => ielp_fourSuject.includes(course.code));
    const hasThreeSubjectIELP = suggestedCourses.some(course => ielp_threeSuject.includes(course.code));
    // Adjust number of suggestions if IELP courses are present
    let maxSuggestions = nSuggest;
    if (hasFourSubjectIELP) {
        maxSuggestions = 4;
    } else if (hasThreeSubjectIELP) {
        maxSuggestions = 3;
    }

    // console.log(suggestedCourses.map(c => c.code).join(', '));
    // console.log(suggestedCourses.slice(0, maxSuggestions).map(c => c.code).join(', '));

    return suggestedCourses.slice(0, maxSuggestions).map(c => c.code);
}

let equivalentCourses = {
    'CSE 101': 'CSE 100',//Introduction to Computing 
    'CSE 102': 'CSE 103',//Applied Math in Computing
    'CSE 107': 'CSE 104',//Data Structures and Algorithms
    'CSE 305': 'CSW 303',//Software Engineering
    'CSE 307': 'CSW 304',//Web Programming
    'CSE 442': 'CSW 309',//Information System Analysis and Design
    'CSE 453': 'CSW 405',//Software Testing
    'CSE 483': 'CSW 406',//Software Architecture
    'CSE 441': 'CSW 430',//Mobile Application Development
    'CSE 443': 'CSW 306',//.Net Programming
    'EBS 415': 'CSW 435',//Project Management
    'CSE 482': 'CSW 437',//UI/UX Design
    'CSE 450': 'CSW 439',//Data Mining
    'CSE 449': 'CSW 330',//Artificial Intelligence
    'CSE 457': 'CSW 331',//Image Processing
    'CSE 490': 'CSW 332',//Machine Learning and applications
    'CSE 470': 'CSN 305',//Cloud Computing
    'CSE 303': 'CSW 310',//Analysis and Design of Algorithms
    'MATH 101':'MATH 111',
    'POLS 132': 'POLS 130',
    'POLS 133': 'POLS 131',
}

function getEquivalentCourse(course) {
    return equivalentCourses[course] || course;
}


// Export the function so it can be used in other modules.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getSuggestedCourses, getEquivalentCourse };
}

// let suggestedCourses = getSuggestedCourses(['IELP 1', 'POLS 133'], 6, 'swe', '2023', null);
// console.log(suggestedCourses);
// suggestedCourses = getSuggestedCourses(['IELP 6', 'INFO 101', 'POLS 134', 'MATH 111', 'CSE 100', 'WRT 122', 'POLS 135'], 6, 'swe', '2024', null);
// console.log(suggestedCourses);
// suggestedCourses = getSuggestedCourses(['IELP 1', 'POLS 130'], 6, 'swe', '2022', null);
// console.log(suggestedCourses);
// suggestedCourses = getSuggestedCourses(['IELP 4', 'POLS 130', 'CSE 101', 'MATH 101'], 6, 'swe', '2021', null);
// console.log(suggestedCourses);