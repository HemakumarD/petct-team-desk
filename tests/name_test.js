const fs=require('fs'); const html=fs.readFileSync(''+require('path').resolve(__dirname,'../claude/index.html')+'','utf8');
const a=html.indexOf('const NAME_TITLES'); const b=html.indexOf('function properDoctor'); const c=html.indexOf('\n}\n',b)+3;
eval(html.slice(a,c).replace('const NAME_TITLES','var NAME_TITLES'));
const tests=["Mr.KANNAN G","mrs  rukmani sampath","MS.LAKSHMI","Mr .ravi kumar","mr kannan","Mrs.SALMA S.L","Mr.D P TIWARI","miss.priya","Master.ARJUN","MRINAL SEN","Msk Rao","mrs.o'brien mary","Mr. A K VADIVEL","Mrs.T SHANTHI"," mr.  mohan  c v ","MD MAFIDUR RAHAMAN","Mrs.KALPANA GHOSH","Shri.raman"];
for(const t of tests) console.log(JSON.stringify(t).padEnd(26), '→', properName(t));
for(const d of ["dr.suresh s","DR. PREM KUMAR K J","Dr.T RAJA CANCER CARE LLP","self","raghunath k j","Dr.K.S. Santhosh Anand"]) console.log(JSON.stringify(d).padEnd(26),'→',properDoctor(d));
