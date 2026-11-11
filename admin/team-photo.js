export async function prepareTeamPhoto(file){
 if(!file)throw Error('Seleciona uma fotografia.');
 if(file.size>20*1024*1024)throw Error('A fotografia deve ter menos de 20 MB.');
 if(file.type&&!file.type.startsWith('image/'))throw Error('Seleciona um ficheiro de imagem.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Não foi possível abrir esta imagem. Experimenta uma fotografia JPEG ou PNG.'));img.src=url});
  if(!img.naturalWidth||!img.naturalHeight)throw Error('A fotografia está vazia.');
  const side=Math.min(img.naturalWidth,img.naturalHeight),canvas=document.createElement('canvas');canvas.width=canvas.height=400;
  const c=canvas.getContext('2d');if(!c)throw Error('Não foi possível preparar a fotografia.');
  c.fillStyle='#fff';c.fillRect(0,0,400,400);c.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,400,400);
  for(const quality of [.85,.7,.55,.4]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=180000)return data}
  throw Error('Esta imagem é demasiado grande. Experimenta outra fotografia.');
 }finally{URL.revokeObjectURL(url)}
}
