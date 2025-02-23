import { Formik } from 'formik';
import vine from '@vinejs/vine'
import { PageLayout } from "~/components/PageLayout";
import { PageTitle } from '~/components/Typography/PageTitle';

export default function Login() {
    return <PageLayout>
        <PageTitle>Login</PageTitle>
        <Formik initialValues={{
            email: '',
            password: ''
        }}
        validate={async (values) => {
            const formSchema = vine.compile(vine.object({}))
            const validationResult = await formSchema.tryValidate(values)
            console.log("validationResult", validationResult)
            return {}
        }}
         onSubmit={(values) => {
            console.log("Submitted ", values)
         }}>
            <form>
            <input type="text"></input>
            <input type="text"></input>
            </form>

        </Formik>
    </PageLayout>

}