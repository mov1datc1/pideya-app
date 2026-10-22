import React,{useEffect,useState} from 'react';
import {View,Text,Button,Alert} from 'react-native';
import {supabase} from '../services/supabase';
export default function OrderTimeProposal({orderId}:{orderId:string}){
 const [order,setOrder]=useState<any>(null),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false);
 const load=async()=>{const r=await supabase.from('orders').select('status,response_deadline,promised_from,promised_to,proposal_expires_at').eq('id',orderId).single();if(!r.error)setOrder(r.data);};
 useEffect(()=>{void load();const t=setInterval(()=>{setNow(Date.now());void load();},15000);return()=>clearInterval(t);},[orderId]);
 if(!order||order.status!=='PENDING')return null;
 const seconds=Math.max(0,Math.ceil((Date.parse(order.response_deadline)-now)/1000));
 return <View style={{padding:16,backgroundColor:'#e8f5f1',gap:8}}><Text>Respuesta del negocio: {seconds>0?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} restantes`:'Plazo cumplido; esperando confirmación del servidor'}</Text>
 {order.proposal_expires_at&&<><Text>El negocio propone entregar entre {new Date(order.promised_from).toLocaleTimeString()} y {new Date(order.promised_to).toLocaleTimeString()}. Si no deseas esperar, cancela antes de aceptar.</Text>
 <Button title="Acepto esperar hasta esa hora" disabled={busy||seconds===0} onPress={async()=>{setBusy(true);try{const r=await supabase.rpc('client_accept_time',{p_order_id:orderId});if(r.error)throw r.error;await load();}catch(e:any){Alert.alert('No se pudo confirmar',e.message);}finally{setBusy(false);}}}/></>}
 </View>;
}
