import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { colors, textStyles, spacing, radius, fonts } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Terms'>;

export const TERMS_ACCEPTED_KEY = '@pideya/terms_accepted';

const TERMS_TEXT = `TERMINOS Y CONDICIONES DE USO — PIDE YA

Ultima actualizacion: Marzo 2026

Bienvenido a Pide ya. Al utilizar nuestra aplicacion, aceptas los siguientes terminos y condiciones. Por favor leelos cuidadosamente.

1. DESCRIPCION DEL SERVICIO

Pide ya es una plataforma tecnologica que conecta a usuarios con restaurantes locales en la region de Los Altos de Jalisco para facilitar la compra y entrega de alimentos a domicilio. Pide ya actua unicamente como intermediario tecnologico.

2. RESPONSABILIDAD SOBRE LOS PRODUCTOS

2.1 Los restaurantes registrados son los unicos responsables de la calidad, preparacion, higiene y seguridad de los alimentos que venden a traves de la plataforma.

2.2 Pide ya NO es responsable por:
  - La calidad o estado de los alimentos entregados.
  - Alergias, intolerancias o reacciones derivadas del consumo de alimentos.
  - Productos faltantes, equivocados o danados durante la preparacion.
  - Demoras en la preparacion de los pedidos por parte del restaurante.

3. SERVICIO DE ENTREGA

3.1 Los repartidores son personal propio de cada restaurante o contratistas independientes. Pide ya no es el empleador ni tiene control directo sobre los repartidores.

3.2 Pide ya NO es responsable por:
  - Retrasos en la entrega causados por trafico, clima u otros factores externos.
  - Danos a los productos durante el transporte.
  - Pedidos extraviados o entregados en la direccion incorrecta proporcionada por el usuario.

4. PEDIDOS Y PAGOS

4.1 Al realizar un pedido, el usuario se compromete a pagar el monto total indicado, incluyendo subtotal, costo de envio y cuota de servicio.

4.2 La cuota de servicio es un cargo operativo que permite mantener y mejorar la plataforma.

4.3 Los precios mostrados en la aplicacion son establecidos directamente por los restaurantes y pueden cambiar sin previo aviso.

4.4 En caso de pago en efectivo, el usuario debe tener el monto exacto o indicar con cuanto pagara para que el repartidor lleve cambio.

5. CANCELACIONES Y REEMBOLSOS

5.1 Un pedido puede ser cancelado unicamente si aun no ha sido aceptado por el restaurante (estado "Pendiente").

5.2 Una vez aceptado el pedido, no es posible cancelarlo a traves de la aplicacion. El usuario debera contactar directamente al restaurante.

5.3 Los reembolsos por productos defectuosos o pedidos incorrectos seran gestionados directamente entre el usuario y el restaurante.

6. CUENTA DE USUARIO

6.1 El usuario es responsable de mantener la confidencialidad de su cuenta y de toda la actividad que ocurra bajo ella.

6.2 Pide ya se reserva el derecho de suspender o cancelar cuentas que presenten uso fraudulento, abusivo o que violen estos terminos.

7. PRIVACIDAD Y DATOS

7.1 Recopilamos unicamente los datos necesarios para el funcionamiento del servicio: nombre, telefono, email, direcciones de entrega e historial de pedidos.

7.2 No vendemos ni compartimos datos personales con terceros ajenos al servicio.

7.3 Los datos de ubicacion se utilizan unicamente para calcular costos de envio y facilitar la entrega.

8. PROPIEDAD INTELECTUAL

Todo el contenido de la aplicacion Pide ya, incluyendo diseno, logotipos, textos e interfaz, es propiedad de sus creadores y esta protegido por las leyes de propiedad intelectual aplicables.

9. MODIFICACIONES

Pide ya se reserva el derecho de modificar estos terminos en cualquier momento. Los cambios seran efectivos desde su publicacion en la aplicacion. El uso continuado del servicio implica la aceptacion de los terminos actualizados.

10. CONTACTO

Para preguntas, quejas o aclaraciones sobre estos terminos, contactanos a traves de la seccion de soporte en la aplicacion.

Al aceptar estos terminos, confirmas que los has leido, entendido y que aceptas cumplirlos en su totalidad.`;

export const TermsScreen: React.FC<Props> = ({ navigation }) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    navigation.replace('Login');
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']} padded={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terminos y condiciones</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <Text style={styles.termsText}>{TERMS_TEXT}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAccepted((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={16} color={colors.white} />}
          </View>
          <Text style={styles.checkboxLabel}>
            He leido y acepto los terminos y condiciones de uso
          </Text>
        </TouchableOpacity>

        <Button
          title="Aceptar y continuar"
          onPress={handleAccept}
          size="lg"
          disabled={!accepted}
          style={styles.acceptBtn}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cloud,
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.ink,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  termsText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors['ink-secondary'],
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cloud,
    backgroundColor: colors.white,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors['ink-hint'],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.agave,
    borderColor: colors.agave,
  },
  checkboxLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    lineHeight: 20,
  },
  acceptBtn: {},
});
